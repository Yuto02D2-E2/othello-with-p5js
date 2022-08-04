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
    // 1[sec]毎に呼ばれる．背景を描画してから，盤を描画する
    game.draw();
}


function windowResized() {
    // ウィンドウサイズが変更される毎に呼ばれる
    console.log(`[INFO] resize window. (w,h)=(${window.innerWidth}x${window.innerHeight})`);
    resizeCanvas(window.innerWidth, window.innerHeight);
}


function mouseClicked() {
    // マウスをクリックして離したタイミングで呼ばれる．盤の情報を更新する
    game.update();
}


function keyPressed() {
    // キーボードが押されたタイミングで呼ばれる．
    if (keyCode === 82) { // 'r' key
        if (window.confirm("ゲームを初期化します．よろしいですか？")) {
            game.init();
        }
    } else {
        window.alert("キーボードからの入力を検知しました．[r]キーでゲームを初期化できます．");
    }
}


// -----------------------------------------------------------------------------------------------------------------
// 以下クラスの定義．本当は別ファイルに切り出したいけど，p5.jsだと無理っぽい


class Game {
    constructor() {
        this.STONE = { // JSにはEnumが無いらしいので，連想配列？で仮想的に再現する
            SPACE: color(127, 255, 127),
            // SPACE: color("hsba(160, 100%, 50%, 0.5)"),
            WHITE: color(255, 255, 255),
            BLACK: color(0, 0, 0),
        };
        this.BOARD_SIZE = 9;
        this.board = Array.from( // create 2D array (initialize value: this.stone.space)
            new Array(this.BOARD_SIZE), _ => new Array(this.BOARD_SIZE).fill(this.STONE.SPACE)
        );
        // console.info(this.board);
        // MEMO: debug用
        this.mode = "Single";
        this.player = [
            new User("user", this.STONE.BLACK), // 先攻が黒らしい
            new Computer("computer", this.STONE.WHITE)
        ];
        // if (window.confirm("モードを選択してください．\nプレイ人数は1人ですか？")) {
        //     this.mode = "Single";
        //     this.player = [
        //         new User("user"),
        //         new Computer("computer")
        //     ];
        // } else {
        //     this.mode = "Multi";
        //     this.player = [
        //         new User("player1"),
        //         new User("player2")
        //     ];
        // }
        this.player_idx = 0;
    }

    init() {
        console.log("[INFO] sketch.js/Game/game.init() is called");
        // init board
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (((y === 4) && (x === 4)) || ((y === 5) && (x === 5))) {
                    this.board[y][x] = this.STONE.WHITE;
                } else if (((y === 4) && (x === 5)) || ((y === 5) && (x === 4))) {
                    this.board[y][x] = this.STONE.BLACK;
                } else {
                    this.board[y][x] = this.STONE.SPACE;
                }
            }
        }
        // init player
        this.player_idx = 0;
    }

    draw() {
        background(this.STONE.SPACE);
        for (let y = 1; y < this.BOARD_SIZE; y++) {
            for (let x = 1; x < this.BOARD_SIZE; x++) {
                // マス目
                stroke(0);
                strokeWeight(2);
                noFill();
                // TODO: 800の部分をwindow.innnerWidth/Heightを使ってレスポンシブ対応する
                // PCなら800, タブレットなら??, スマホなら??に設定する
                const lx = x * 800 / this.BOARD_SIZE;
                const ly = y * 800 / this.BOARD_SIZE;
                square(lx, ly, lx / x); // 外枠; (lx,ly,size)
                // 石
                if (this.board[y][x] === this.STONE.SPACE) continue;
                noStroke();
                fill(this.board[y][x]);
                const r = (lx / x) * 0.8; // マス目の8割のサイズ
                ellipse(lx + r * 0.1, ly + r * 0.1, r); // (lx,ly,r)
            }
        }
    }

    update() {
        console.log("[INFO] sketch.js/Game/game.update() is called");
        this.player[this.player_idx].check_available();
        this.player[this.player_idx].put_stone();
        this.player[this.player_idx].flip_stone();
        this.player[this.player_idx].update_score();
        this.player_idx ^= 1;

        // ゲームの終了判定
        // if (end) {
        //     this.ending();
        // }
    }

    ending() {
        console.log("[INFO] sketch.js/Game/game.ending() is called");
        const name = this.player[this.player_idx].get_name();
        window.alert(`xx対ooで${name}の勝ちです\nもう一度遊びたい場合は，[r]キーを押してゲームをリセットして下さい．`);
    }
}


class Player {
    constructor(name, stone_color) {
        this.name = name || "anonymous";
        this.stone_color = stone_color;
        this.score = 0;
        this.availables = new Array();
    }

    check_available() {
        // 置ける場所をハイライト表示
        // 置ける場所 := 相手の石を1つ以上挟むことが出来る場所
        // もしも，打てる場所が一つも無い場合はパス．aleatを出す．
        // 置ける場所を探すのは，DFSすれば良さそう
    }
    put_stone() {
        // check_available()で見つかった場所以外に置こうとするとaleatを出してもう一度考えさせる
    }
    flip_stone() { }
    update_score() {
        // 置いた時点で1つ以上ひっくり返せるのは確定しているので(ひっくり返せない場所には置けないから)
        // スコアの更新も必ず発生する
    }

    get get_name() {
        return this.name;
    }
    get get_score() {
        return this.score;
    }
}


class User extends Player {
    constructor(name, stone_color) {
        super(name, stone_color);
    }

    // override
    put_stone() {
    }
}


class Computer extends Player {
    constructor(name, stone_color) {
        super(name, stone_color);
    }

    // override
    put_stone() {
        // 人間らしさを演出するために，1-3[sec]ぐらい待ってから置く．
        // check_available()で得られた中からランダムに選ぶ．
        // Feature(余裕があれば): 数手先を考えて最も多くひっくり返せる場所を選択
    }
}
