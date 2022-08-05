let game; // ゲームオブジェクト;ゲームに関するあらゆる情報を持つ
const DEBUG = false;


function preload() {
    // 効果音，フォントを読み込む
    fontObj = loadFont("./assets/SourceCodePro-Medium.otf");
}


function setup() {
    // sketch.jsが全て読み込まれた？タイミングで一度だけ呼ばれる
    console.log("[INFO] sketch.js/setup() is called.");

    const canvas = createCanvas(window.innerWidth, window.innerHeight); // (width,height)
    canvas.parent("container"); // 親要素<div;id=container>を指定することにより，CSSで扱いやすくなる

    game = new Game();
    game.init();

    switch (game.get_device()) {
        case "PC":
            textSize(28);
            break;
        case "Tablet":
            textSize(32);
            break;
        case "SmartPhone":
            textSize(20);
            break;
        default:
            break;
    }
    textAlign(LEFT, CENTER); // Align(左右,上下)
    textFont(fontObj);
    rectMode(CORNER); // (lx,ly,width,height)
    ellipseMode(CORNER); // (lx,ly,width,height)
    cursor("grab"); // 手の形のカーソルにする
    frameRate(60); // 60[fps]

    game.help();
    if (DEBUG) {
        console.log(`[INFO] inner (W,H)=(${window.innerWidth},${window.innerHeight})`);
        const container = document.getElementById("container");
        console.log(`[INFO] client (W,H)=(${container.clientWidth},${container.clientHeight})`);
    }
}


function draw() {
    // 1/60[sec]毎に呼ばれる．背景を描画してから，盤を描画する
    clear(); // 画面を一旦クリア．これが無いとどんどん上書きされて色が濃くなってしまう
    game.draw();
}


function windowResized() {
    // ウィンドウサイズが変更される毎に呼ばれる
    console.log("[INFO] window resized");
    console.log(`[INFO] inner (W,H)=(${window.innerWidth},${window.innerHeight})`);
    const container = document.getElementById("container");
    console.log(`[INFO] client (W,H)=(${container.clientWidth},${container.clientHeight})`);
    resizeCanvas(window.innerWidth, window.innerHeight); // (width, height)
    game.update_window_size();
}


function mouseClicked() {
    // マウスをクリックして離したタイミングで呼ばれる．盤の情報を更新する
    const [y, x] = game.pos_to_idx(mouseY, mouseX);
    if (game.is_board_inside(y, x)) {
        game.update(y, x);
    }
}


function keyPressed() {
    // キーボードが押されたタイミングで呼ばれる．
    if (keyCode === 82) { // 'r' key
        if (window.confirm("ゲームを初期化します．よろしいですか？")) {
            game.init();
        }
    } else if (keyCode === 72) { // 'h' key
        game.help();
    }
}


// -----------------------------------------------------------------------------------------------------------------
// 以下クラスの定義．本当は別ファイルに切り出したいけど，p5.jsだと無理っぽい?


class Game {
    constructor() {
        this.STONE = { // JSにはEnumが無いらしいので，連想配列？で仮想的に再現する
            WHITE: color(255, 255, 255),
            BLACK: color(0, 0, 0),
            SPACE: color(127, 255, 127),
            HIGHLIGHT: color("#ffff7f"),
            // SPACE: color("hsba(160, 100%, 50%, 0.5)"),
            // AVAILABLE: color("rgba(255,127,255,0.5)"),
            // AVAILABLE: color("#ffccff"),
        };
        const canvas = document.getElementById("container");
        this.BOARD_SIZE = min(
            int(canvas.clientHeight / 100 + 0.5),
            int(canvas.clientWidth / 100 + 0.5)
        ) * 100 * 0.90;
        this.CELL_NUM = 8;
        this.CELL_SIZE = this.BOARD_SIZE / this.CELL_NUM;
        this.board = Array.from( // create 2D array (initialize value: this.stone.space)
            new Array(this.CELL_NUM), _ => new Array(this.CELL_NUM).fill(this.STONE.SPACE)
        );
        this.mode;
        this.player;
        this.player_idx = 0;
        this.device = this.get_device();
        this.directions = [ // 移動用．(y, x). 上から時計回り
            [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]
        ];
    }

    init() {
        console.log("[INFO] sketch.js/Game/game.init() is called");
        // init board
        for (let y = 0; y < this.CELL_NUM; y++) {
            for (let x = 0; x < this.CELL_NUM; x++) {
                if (((y === 3) && (x === 3)) || ((y === 4) && (x === 4))) {
                    this.board[y][x] = this.STONE.WHITE;
                } else if (((y === 3) && (x === 4)) || ((y === 4) && (x === 3))) {
                    this.board[y][x] = this.STONE.BLACK;
                } else {
                    this.board[y][x] = this.STONE.SPACE;
                }
            }
        }
        // init player
        if (window.confirm("モードを選択してください．\nプレイ人数は1人ですか？")) {
            this.mode = "Single";
            this.player = [
                new User("user", this.STONE.BLACK),
                new Computer("computer", this.STONE.WHITE)
            ];
        } else {
            this.mode = "Multi";
            this.player = [
                new User("player1", this.STONE.BLACK),
                new User("player2", this.STONE.WHITE)
            ];
        }
        this.player_idx = 0;
        this.update_availables();
    }

    draw() {
        background(this.STONE.WHITE);
        push(); // 盤，石，ハイライト用の設定範囲
        drawingContext.shadowOffsetX = 5;
        drawingContext.shadowOffsetY = 5;
        drawingContext.shadowBlur = 5;
        drawingContext.shadowColor = color("rgba(0,0,0,0.5)");
        for (let y = 0; y < this.CELL_NUM; y++) {
            for (let x = 0; x < this.CELL_NUM; x++) {
                // マスの格子線と背景色
                stroke(0);
                strokeWeight(2);
                fill(this.STONE.SPACE);
                const lx = x * this.CELL_SIZE, ly = y * this.CELL_SIZE;
                square(lx, ly, this.CELL_SIZE); // 外枠; (lx,ly,size)
                if (this.board[y][x] === this.STONE.SPACE) {
                    if (this.player[this.player_idx].is_available(y, x)) {
                        // 置ける場所をハイライト
                        stroke(this.STONE.HIGHLIGHT);
                        noFill();
                    } else {
                        continue;
                    }
                } else {
                    // 石を描画
                    noStroke();
                    fill(this.board[y][x]);
                }
                const r = this.CELL_SIZE * 0.8; // 円のサイズをマス目の8割のサイズにする
                ellipse(lx + r * 0.1, ly + r * 0.1, r); // (lx,ly,r)
            }
        }
        pop(); // 盤，石，ハイライト用の設定範囲ここまで
        push(); // 文字の設定
        fill(this.STONE.BLACK);
        const info_text = `
            #mode
            -> ${this.mode} play

            #current player
            -> ${this.player[this.player_idx].name}

            #score
            [●]${this.player[this.player_idx].name}:${this.player[this.player_idx].score}
            [○]${this.player[this.player_idx ^ 1].name}:${this.player[this.player_idx ^ 1].score}
        `;
        switch (this.device) {
            case "PC":
                text(
                    info_text,
                    this.BOARD_SIZE * 1.05, // lx
                    0, // ly
                    window.innerWidth - this.BOARD_SIZE, // text width
                    window.innerHeight, // text height
                );
                break;
            case "Tablet":
                text(
                    info_text,
                    0, // lx
                    this.BOARD_SIZE * 0.9, // ly
                    window.innerWidth, // text width
                    window.innerHeight - this.BOARD_SIZE, // text height
                );
                break;
            case "SmartPhone":
                text(
                    info_text,
                    0, // lx
                    this.BOARD_SIZE * 0.9, // ly
                    window.innerWidth, // text width
                    window.innerHeight - this.BOARD_SIZE, // text height
                );
                break;
            default:
                break;
        };
        pop(); //文字の設定ここまで
    }

    update_window_size() {
        console.log(`[INFO] sketch.js/Game/game.update_window_size() is called`);
        const canvas = document.getElementById("container");
        this.BOARD_SIZE = min(
            int(canvas.clientHeight / 100 + 0.5),
            int(canvas.clientWidth / 100 + 0.5)
        ) * 100 * 0.90;
        this.CELL_SIZE = this.BOARD_SIZE / this.CELL_NUM;
        this.device = this.get_device()
    }

    get_device() {
        if (1000 < window.innerWidth) return "PC";
        if (600 < window.innerWidth) return "Tablet";
        return "SmartPhone";
    }

    update(y, x) {
        console.log("[INFO] sketch.js/Game/game.update() is called");
        if (!this.put_stone(y, x)) {
            window.alert("その場所に置くことは出来ません．\nハイライトされている部分のみ置くことが出来ます");
            return;
        }
        this.player[this.player_idx].score++;
        this.flip_stone(y, x);
        this.player_idx ^= 1;
        if (this.update_availables() === 0) {
            window.alert("次のプレイヤーが打てる場所はありません．パスします");
            this.player_idx ^= 1;
        }
        if (this.is_game_over()) {
            this.ending();
        }
    }

    pos_to_idx(mouse_y, mouse_x) {
        // ウィンドウ上の座標から，board上でのindexに変換する
        console.log(`[INFO] pos2idx:(${mouse_y},${mouse_x}) -> (${Math.floor(mouse_y / this.CELL_SIZE)},${Math.floor(mouse_x / this.CELL_SIZE)})`);
        return [
            Math.floor(mouse_y / this.CELL_SIZE),
            Math.floor(mouse_x / this.CELL_SIZE),
        ];
    }

    is_board_inside(y, x) { // y,x is index
        // board上に含まれているか
        if ((y < 0) || (this.CELL_NUM <= y)) return false;
        if ((x < 0) || (this.CELL_NUM <= x)) return false;
        return true;
    }

    put_stone(y, x) {
        if (this.player[this.player_idx].is_available(y, x)) {
            this.board[y][x] = this.player[this.player_idx].stone_color;
            return true;
        }
        return false;
    }

    update_availables() {
        this.player[this.player_idx].availables = new Array(); // all clear (reset)
        for (let y = 0; y < this.CELL_NUM; y++) {
            for (let x = 0; x < this.CELL_NUM; x++) {
                if (this.board[y][x] !== this.STONE.SPACE) continue;
                if (this.is_available(y, x)) {
                    this.player[this.player_idx].availables.push({ y: y, x: x });
                }
            }
        }
        return this.player[this.player_idx].availables.length;
    }

    is_available(y, x) {
        for (let i = 0; i < this.directions.length; i++) {
            const [dy, dx] = this.directions[i];
            let line = this.get_line(y, x, dy, dx);
            if (line.length <= 1) continue;
            if (this.board[line[0].y][line[0].x] !== this.player[this.player_idx ^ 1].stone_color) {
                continue;
            }
            // この時点で 1 < length は保証されているので，line[line.length-1]が配列外参照を起こすことは無い
            if (this.board[line[line.length - 1].y][line[line.length - 1].x] !==
                this.player[this.player_idx].stone_color) {
                continue;
            }
            return true;
        }
        return false;
    }

    flip_stone(y, x) {
        let waiting_list = new Array();
        for (let i = 0; i < this.directions.length; i++) {
            const [dy, dx] = this.directions[i];
            let line = this.get_line(y, x, dy, dx);
            if (line.length <= 1) continue;
            if (this.board[line[0].y][line[0].x] !== this.player[this.player_idx ^ 1].stone_color) {
                continue;
            }
            if (this.board[line[line.length - 1].y][line[line.length - 1].x] !==
                this.player[this.player_idx].stone_color) {
                continue;
            }
            waiting_list = waiting_list.concat(line.slice(0, -1));
        }
        // flip
        for (const wl of waiting_list) {
            this.board[wl.y][wl.x] = this.player[this.player_idx].stone_color;
            // update score
            this.player[this.player_idx].score++;
            this.player[this.player_idx ^ 1].score--;
        }
    }

    get_line(cur_y, cur_x, dy, dx) {
        // (cur_y, cur_x)から(dy, dx)方向に進んだ時，board[cur_y][cur_x]の色で囲まれている部分のidxのlistを返す
        let line = new Array();
        while (this.is_board_inside(cur_y + dy, cur_x + dx)) {
            if (this.board[cur_y + dy][cur_x + dx] === this.STONE.SPACE) {
                break;
            }
            line.push({ y: cur_y + dy, x: cur_x + dx });
            if (this.board[cur_y + dy][cur_x + dx] === this.player[this.player_idx].stone_color) {
                break;
            }
            cur_y += dy, cur_x += dx;
        }
        return line;
    }

    is_game_over() {
        for (let y = 0; y < this.CELL_NUM; y++) {
            for (let x = 0; x < this.CELL_NUM; x++) {
                if (this.board[y][x] === this.STONE.SPACE) return false;
            }
        }
        return true;
    }

    ending() {
        console.log("[INFO] sketch.js/Game/game.ending() is called");
        const name = this.player[this.player_idx].name;
        window.alert(`xx対ooで${name}の勝ちです\nもう一度遊びたい場合は，[r]キーを押してゲームをリセットして下さい．`);
    }

    help() {
        if (DEBUG) return;
        window.alert(`
        [HELP]
        これはヘルプ画面です．
        1. r キーでゲームを初期化
        2. h キーでヘルプを表示
        できます．

        スマホ，タブレットの場合は，このページを再読み込みすれば，
        ゲームの初期化，ヘルプの表示が出来ます
        `);
    }
}


class Player {
    constructor(name, stone_color) {
        this.name = name || "anonymous";
        this.stone_color = stone_color;
        this.score = 2;
        this.availables = new Array();
    }

    is_available(y, x) {
        // return: playerが(y,x)に置けるかどうか
        for (const ele of this.availables) {
            if (ele.y === y && ele.x === x) return true;
        }
        return false;
    }
}


class User extends Player {
}


class Computer extends Player {
}
