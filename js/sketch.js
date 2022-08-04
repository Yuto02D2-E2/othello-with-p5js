let game; // ゲームオブジェクト;ゲームに関するあらゆる情報を持つ


function setup() {
    // sketch.jsが全て読み込まれた？タイミングで一度だけ呼ばれる
    console.log("[INFO] sketch.js/setup() is called.");

    const canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent("canvas"); // 親要素<div;id=canvas>を指定することにより，CSSで扱いやすくなる

    rectMode(CORNER); // (lx,ly,width,height)
    ellipseMode(CORNER); // (lx,ly,width,height)
    cursor("grab"); // 手の形のカーソルにする
    frameRate(60); // 60[fps]

    game = new Game();
    game.init();
}


function draw() {
    // 1/60[sec]毎に呼ばれる．背景を描画してから，盤を描画する
    clear(); // 画面を一旦クリア．これが無いとどんどん上書きされて色が濃くなってしまう
    game.draw();
}


function windowResized() {
    // ウィンドウサイズが変更される毎に呼ばれる
    console.log(`[INFO] resize window. (w,h)=(${window.innerWidth}x${window.innerHeight})`);
    resizeCanvas(window.innerWidth, window.innerHeight);
}


function mouseClicked() {
    // マウスをクリックして離したタイミングで呼ばれる．盤の情報を更新する
    const [y, x] = game.pos_to_idx(mouseY, mouseX);
    if (game.is_board_inside(y, x)) {
        game.update(mouseY, mouseX);
    }
}


function keyPressed() {
    // キーボードが押されたタイミングで呼ばれる．
    if (keyCode === 82) { // 'r' key
        if (window.confirm("ゲームを初期化します．よろしいですか？")) {
            game.init();
        }
    } else {
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
            // SPACE: color("hsba(160, 100%, 50%, 0.5)"),
            // AVAILABLE: color("rgba(255,127,255,0.5)"),
            // AVAILABLE: color("#ffccff"),
        };
        this.BOARD_SIZE = 700;
        // TODO: 700の部分をwindow.innnerWidth/Height等を使ってレスポンシブ対応する
        // PCなら700, タブレットなら??, スマホなら??に設定する
        this.CELL_NUM = 8; // 8 + 2(padding)
        this.CELL_SIZE = this.BOARD_SIZE / this.CELL_NUM;
        this.board = Array.from( // create 2D array (initialize value: this.stone.space)
            new Array(this.CELL_NUM + 2), _ => new Array(this.CELL_NUM + 2).fill(this.STONE.SPACE)
        );
        // console.info(this.board);
        // MEMO: debug用
        this.mode = "Single";
        this.player = [
            new User("user", this.STONE.BLACK, this.CELL_NUM), // 先攻が黒らしい
            new Computer("computer", this.STONE.WHITE, this.CELL_NUM)
        ];
        // if (window.confirm("モードを選択してください．\nプレイ人数は1人ですか？")) {
        //     this.mode = "Single";
        //     this.player = [
        //         new User("user", this.STONE.BLACK),
        //         new Computer("computer", this.STONE.WHITE)
        //     ];
        // } else {
        //     this.mode = "Multi";
        //     this.player = [
        //         new User("player1", this.STONE.BLACK),
        //         new User("player2", this.STONE.WHITE)
        //     ];
        // }
        this.player_idx = 0;
    }

    init() {
        console.log("[INFO] sketch.js/Game/game.init() is called");
        // init board
        for (let y = 1; y <= this.CELL_NUM; y++) {
            for (let x = 1; x <= this.CELL_NUM; x++) {
                if (((y === 4) && (x === 4)) || ((y === 5) && (x === 5))) {
                    this.board[y][x] = this.STONE.WHITE;
                } else if (((y === 4) && (x === 5)) || ((y === 5) && (x === 4))) {
                    this.board[y][x] = this.STONE.BLACK;
                } else {
                    this.board[y][x] = this.STONE.SPACE;
                }
            }
        }
        // console.info(this.board);
        // init player
        this.player_idx = 0;
        this.check_available();
    }

    draw() {
        background(this.STONE.WHITE);
        for (let y = 1; y <= this.CELL_NUM; y++) {
            for (let x = 1; x <= this.CELL_NUM; x++) {
                // マスの格子線と背景色
                stroke(0);
                strokeWeight(2);
                fill(this.STONE.SPACE);
                const lx = x * this.CELL_SIZE, ly = y * this.CELL_SIZE;
                square(lx, ly, this.CELL_SIZE); // 外枠; (lx,ly,size)
                if (this.board[y][x] === this.STONE.SPACE) {
                    if (this.player[this.player_idx].availables.includes([y, x])) {
                        // 置ける場所をハイライト
                        stroke(255, 127, 255, 0.5);
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
    }

    update(mouse_y, mouse_x) {
        console.log("[INFO] sketch.js/Game/game.update() is called");
        const [y, x] = this.pos_to_idx(mouse_y, mouse_x); // unpack
        if (!this.put_stone(y, x)) {
            console.log("その場所に置くことは出来ません．\nハイライトされている部分のみ置くことが出来ます");
            // window.alert("その場所に置くことは出来ません．\nハイライトされている部分のみ置くことが出来ます");
            return;
        }
        // this.player[this.player_idx].flip_stone();
        // this.player[this.player_idx].update_score();
        this.player_idx ^= 1;
        if (this.check_available() === 0) {
            console.log("次のプレイヤーが打てる場所はありません．パスします");
            // window.alert("次のプレイヤーが打てる場所はありません．パスします");
            this.player_idx ^= 1;
        }
        if (is_game_over()) {
            this.ending();
        }
    }

    ending() {
        console.log("[INFO] sketch.js/Game/game.ending() is called");
        const name = this.player[this.player_idx].get_name();
        window.alert(`xx対ooで${name}の勝ちです\nもう一度遊びたい場合は，[r]キーを押してゲームをリセットして下さい．`);
    }

    help() {
        window.alert(`
        キーボードからの入力を検知しました．
        [INFO]
        1. r キーでゲームを初期化
        2. その他のキーでヘルプを表示
        できます．
        `);
    }

    pos_to_idx(mouse_y, mouse_x) {
        console.log(`[INFO] pos2idx:(mouseY,mouseX)=(${mouse_y},${mouse_x})`);
        return [
            Math.floor(mouse_y / this.CELL_SIZE),
            Math.floor(mouse_x / this.CELL_SIZE),
        ];
    }

    is_board_inside(y, x) { // y,x is index
        if ((y < 0) || (this.CELL_NUM < y)) return false;
        if ((x < 0) || (this.CELL_NUM < x)) return false;
        return true;
    }

    put_stone(y, x) {
        if (this.player[this.player_idx].availables.includes([y, x])) {
            this.board[y][x] = this.player[this.player_idx].stone_color;
            return true;
        }
        return false;
    }

    check_available() {
        // 置ける場所をハイライト表示
        // 置ける場所 := 相手の石を1つ以上挟むことが出来る場所
        // もしも，打てる場所が一つも無い場合はパス．aleatを出す．
        // 方針：場所を全探索して，置けるかどうか判定する．判定するために，8方向それぞれを見て，隣に別の色が居て，それ以降に同じ色が出てこればok
        this.player[this.player_idx].availables.splice(0); // all clear
        for (let y = 1; y < this.CELL_NUM; y++) {
            for (let x = 1; x < this.CELL_NUM; x++) {
                if ((this.board[y][x] === this.STONE.SPACE) && this.is_available(y, x)) {
                    this.player[this.player_idx].availables.push([y, x]);
                }
            }
        }
        return this.player[this.player_idx].availables.length;
    }

    is_available(y, x) {
        const directions = [ // (y, x). 上から時計回り
            [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]
        ];
        for (let i = 0; i < directions.length; i++) {
            const [dy, dx] = directions[i];
            let line = new Array();
            while (this.is_board_inside(y + dy, x + dx)) {
                if (this.board[y + dy][x + dx] === this.STONE.SPACE) break;
                line.push(this.board[y + dy][x + dx]);
                if (this.board[y + dy][x + dx] === this.player[this.player_idx].stone_color) break;
            }
            // console.log(`(${y},${x},${y + dy},${x + dx}) -> line:${line}`);
            if ((line[0] === this.player[this.player_idx ^ 1].stone_color) &&
                (line[line.length - 1] === this.player[this.player_idx].stone_color)) {
                return true;
            }
        }
        return false;
    }

    flip_stone() { }
    update_score() { }

    is_game_over() {
        for (let y = 1; y < this.CELL_NUM; y++) {
            for (let x = 1; x < this.CELL_NUM; x++) {
                if (this.board[y][x] === this.STONE.SPACE) return false;
            }
        }
        return true;
    }
}


class Player {
    constructor(name, stone_color) {
        this.name = name || "anonymous";
        this.stone_color = stone_color;
        this.score = 0;
        this.availables = new Array();
    }

    get get_name() {
        return this.name;
    }
    get get_score() {
        return this.score;
    }
}


class User extends Player {
    // constructor(name, stone_color, CELL_NUM) {
    //     super(name, stone_color, CELL_NUM);
    // }

    // override
    put_stone() {
    }
}


class Computer extends Player {
    // constructor(name, stone_color) {
    //     super(name, stone_color);
    // }

    // override
    put_stone() {
        // 人間らしさを演出するために，1-3[sec]ぐらい待ってから置く．
        // check_available()で得られた中からランダムに選ぶ．
        // Feature(余裕があれば): 数手先を考えて最も多くひっくり返せる場所を選択
    }
}
