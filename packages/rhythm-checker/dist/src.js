const Config = {
    BPM: 180,
    beats: 8, // 180bpmで8拍分でプレイ。ステージデータは1拍4文字で読み取る。（これは固定）
    modelToPlayGapBeats: 0.2,
    judgePrecision: 1 / 50 // 判定の際、実際のノーツ位置との差異が何%まで許容されるか
}

// 再生バーが一定速度で動くとしたときの1拍分の幅
const oneBeatWidthPx = 1000 / (2 * Config.beats + Config.modelToPlayGapBeats);
const stageBeatWidthPx = Config.beats * oneBeatWidthPx;
const playAreaWidthPx = stageBeatWidthPx + Config.modelToPlayGapBeats * oneBeatWidthPx;

// つめもの分の幅
const modelOffsetPx = oneBeatWidthPx * Config.beats;
const modelUserOffsetPx = oneBeatWidthPx * (Config.beats + Config.modelToPlayGapBeats);

const modelPlayDurationMs = (60 / Config.BPM) * Config.beats * 1000;
const bufferDurationMs = (60 / Config.BPM) * Config.modelToPlayGapBeats * 1000;
const playDurationMs = (60 / Config.BPM) * (Config.beats + Config.modelToPlayGapBeats) * 1000;

// 画像位置調整用
const noteImageOffsetX = 20;


// ステージクリエイト機能関連
const stageStringSeparator = "|";
const stageStringKeyName = "stage";



let game;
const KeyCodeToName = {
    "65": "a",
    "83": "s",
    "68": "d",
    "70": "f",
    "71": "g",
    "72": "h",
    "74": "j",
    "75": "k",
    "76": "l",
};

const GameState = {
    COUNTDOWN: "countdown",
    MODEL: "model",
    WAIT: "wait",
    PLAY: "play",
    END: "end",
    RESULT: "result",
};

const images = {
    countdown1: loadImage("resources/1.png"),
    countdown2: loadImage("resources/2.png"),
    countdown3: loadImage("resources/3.png"),
    textModel: loadImage("resources/model.png"),
    textYou: loadImage("resources/you.png"),
    note: loadImage("resources/note.png"),
    rednote: loadImage("resources/rednote.png"),
    greennote: loadImage("resources/greennote.png"),
    graynote: loadImage("resources/graynote.png"),
    end: loadImage("resources/end.png"),
    S: loadImage("resources/S.png"),
    A: loadImage("resources/A.png"),
    B: loadImage("resources/B.png"),
    C: loadImage("resources/C.png"),
    rank: loadImage("resources/rank.png"),
};

const audio = {
    metronome: {
        index: 0,
        src: new Array(10).fill(null).map((v) => new Audio("resources/metronome.mp3")),
    },
    clap: {
        index: 0,
        src: new Array(10).fill(null).map((v) => new Audio("resources/clap.mp3")),
    },
    whistle: {
        src: new Audio("resources/whistle.mp3"),
    },
};

class AudioPlayer {
    metronome () {
        audio.metronome.src[audio.metronome.index].play();
        audio.metronome.index++;
        audio.metronome.index %= 10;
    }
    clap () {
        audio.clap.src[audio.clap.index].play();
        audio.clap.index++;
        audio.clap.index %= 10;
    }
    whistle () {
        audio.whistle.src.play();
    }
};

const defaultStages = [
    {
        rhythm: "o---------------o---------------",
    },
    {
        rhythm: "o-------o-------o-------o-------",
    },
    {
        rhythm: "o---o---o-------o---o---o-------",
    },
    {
        rhythm: "o-o-----o-------o-o-----o-------",
    },
    {
        rhythm: "o-------o-------o---o---o-------",
    },
    {
        rhythm: "o---o---o-o-o-------o---o---o---",
    },
    {
        rhythm: "o---o---o-------o-o---o-o-------",
    },
    {
        rhythm: "o-o---o-o-------o-o---o-o-------",
    },
    {
        rhythm: "o---o-o-o-------o---o-o-o-------",
    },
    {
        rhythm: "o-o-o-o-o-o-o---o---o---o---o---",
    },
];

function loadImage (url) {
    const ret = new Image();
    ret.src = url;
    return ret;
}

function parseStagesFromText (text) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => 0 < line.length)
        .join(stageStringSeparator);
}

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("game-start-button");
    const createStageButton = document.getElementById("create-stage-button");
    const stageTextArea = document.getElementById("original-stage");
    const urlSpan = document.getElementById("generated-url");

    game = new Game();

    startButton.addEventListener("click", () => {
        // もしステージデータがあれば読み込み
        const userDefinedStageString = parseStagesFromText(stageTextArea.value);
        const userDefinedStages = userDefinedStageString.split(stageStringSeparator);

        let stages = defaultStages;
        if (0 < userDefinedStageString.length) {
            stages = userDefinedStages.map(line => ({ rhythm: line }));
        }

        game.start(stages);
    });

    // ステージクリエイト機能
    createStageButton.addEventListener("click", () => {
        const obj = {};
        obj[stageStringKeyName] = parseStagesFromText(stageTextArea.value);

        const generatedURL = window.location.protocol + window.location.host + "?" + new URLSearchParams(obj).toString();
        urlSpan.innerText = generatedURL;

        // awaitしません笑
        navigator.clipboard.writeText(generatedURL);
    });

    // ステージ読み込み機能
    (() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (!queryParams.has(stageStringKeyName)) {
            return;
        }

        const stageData = queryParams.get(stageStringKeyName).split(stageStringSeparator).join("\n");
        stageTextArea.value = stageData;
    })();
});

class Renderer {
    constructor (canvas) {
        this.ctx = canvas.getContext("2d");
        this.width = canvas.width;
        this.height = canvas.height;
    }

    clear () {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawStage (hitpoints) {
        // リズム点の描画
        // 0 <= hitpoints[i] <= 1
        for (const point of hitpoints) {
            this.ctx.drawImage(images.note, point * stageBeatWidthPx - noteImageOffsetX, 120);
            this.ctx.drawImage(images.graynote, point * stageBeatWidthPx - noteImageOffsetX + modelUserOffsetPx, 120);
        }

        // 「お手本」「あなた」の描画
        this.ctx.drawImage(images.textModel, 0, 0);
        this.ctx.drawImage(images.textYou, modelUserOffsetPx, 0);
    }

    drawPlayPoints (hitpoints) {
        // [{ type, ratio }]を仮定

        for (const point of hitpoints) {
            const img = point.type == "ok" ? images.greennote : images.rednote;

            this.ctx.drawImage(img, point.ratio * playAreaWidthPx - noteImageOffsetX + modelOffsetPx, 120);
        }
    }

    drawModelBar (ratio) {
        // 現在位置バーの描画
        // 0 <= ratio <= 1を仮定
        this.ctx.beginPath();
        this.ctx.moveTo(stageBeatWidthPx * ratio, 100);
        this.ctx.lineTo(stageBeatWidthPx * ratio, 200);
        this.ctx.stroke();
    }
    drawPlayBar (ratio) {
        this.ctx.beginPath();
        this.ctx.moveTo(playAreaWidthPx * ratio + modelOffsetPx, 100);
        this.ctx.lineTo(playAreaWidthPx * ratio + modelOffsetPx, 200);
        this.ctx.stroke();
    }

    blurOn (level) {
        this.ctx.filter = `blur(${level}px)`;
    }
    blurOff () {
        this.ctx.filter = "blur(0px)";
    }

    drawCountDown (image) {
        this.ctx.drawImage(image, 400, 0);
    }

    drawStageCount (all, rem) {
        this.ctx.font = "40px serif";
        this.ctx.fillText(`${rem}/${all}`, 850, 50);
    }

    drawEnd () {
        this.ctx.drawImage(images.end, 250, 0);
    }

    drawScore (score) {
        this.ctx.font = "40px serif";
        this.ctx.fillText(`得点: ${score}`, 10, 100);
    }

    drawRank (rank) {
        this.ctx.drawImage(images.rank, 200, 0);
        switch (rank) {
            case "S":
                {
                    this.ctx.drawImage(images.S, 800, 0);
                }
                break;
            case "A":
                {
                    this.ctx.drawImage(images.A, 800, 0);
                }
                break;
            case "B":
                {
                    this.ctx.drawImage(images.B, 800, 0);
                }
                break;
            case "C":
                {
                    this.ctx.drawImage(images.C, 800, 0);
                }
                break;

            default:
                {
                    console.error(`drawRank: 未定義のランク: ${rank}`);
                }
        }
    }
}

class CountDownState {
    constructor (currentTime) {
        this.startTime = currentTime;
    }
}

class StageData {
    constructor (currentStage, stages) {
        this.currentStage = currentStage;
        this.score = 0;
        this.stages = stages;
    }

    hitpoints () {
        const rhythm = this.stages[this.currentStage].rhythm;

        const ret = [];
        for (let i = 0; i < rhythm.length; i++) {
            if (rhythm[i] == 'o') {
                ret.push(i / 32);
            }
        }
        return ret;
    }
}

class ModelData {
    constructor (currentTime) {
        this.startTime = currentTime;
        this.count = 0;
    }
}

class WaitData {
    constructor (currentTime) {
        this.startTime = currentTime;
    }
}

class PlayData {
    constructor (currentTime) {
        this.startTime = currentTime;
        this.hitpoints = [];
        this.lastCorrectIndex = -1;
    }

    hit (type, ratio) {
        this.hitpoints.push({ type, ratio });
    }
}

class EndData {
    constructor (currentTime) {
        this.startTime = currentTime;
        this.whistled = false;
    }
}

class ResultData {
    constructor () {
    }

    calculateRank (noteCount, score) {
        // 理論上取れる点数に対して
        // 8割以上: S
        // 6割以上: A
        // 4割以上: B
        // それ以外: C
        const maxPoint = 50 * noteCount;
        if (maxPoint <= 0) {
            this.rank = "S";
            return;
        }

        const ratio = score / maxPoint;
        if (0.8 <= ratio) {
            this.rank = "S";
        }
        else if (0.6 <= ratio) {
            this.rank = "A";
        }
        else if (0.4 <= ratio) {
            this.rank = "B";
        }
        else {
            this.rank = "C";
        }
    }
}

class Game {
    constructor () {
    }

    reset (stages) {
        this.keyBuffer = [];
        // キー入力監視
        if (!this.keydownTracked) {
            this.keydownTracked = true;
            window.addEventListener("keydown", (e) => {
                if (KeyCodeToName[e.keyCode] == null) {
                    return;
                }
                this.keyBuffer.push(e.keyCode);
            });
        }

        if (this.animationId) {
            window.cancelAnimationFrame(this.animationId);
        }

        this.canvas = document.getElementById("game-screen");
        this.scoreSpan = document.getElementById("game-score");
        this.running = false;
        this.state = GameState.COUNTDOWN;
        this.renderer = new Renderer(this.canvas);
        this.audioPlayer = new AudioPlayer();
        this.stateData = new CountDownState(performance.now(), stages);
        this.stageData = new StageData(0, stages);
    }

    start (stages) {
        this.reset(stages);
        this.running = true;
        window.requestAnimationFrame(this.gameLoop);
    }

    gameLoop = (timeStamp) => {
        // 入力の取得
        const keyInput = [...this.keyBuffer];
        this.keyBuffer = [];

        this.renderer.clear();
        this.scoreSpan.innerText = this.stageData.score;

        switch (this.state) {
            case GameState.COUNTDOWN:
                {
                    this.renderer.blurOn(3);
                    this.renderer.drawStage(this.stageData.hitpoints());
                    this.renderer.drawStageCount(this.stageData.stages.length, this.stageData.currentStage + 1);
                    this.renderer.blurOff();

                    const elapsed = performance.now() - this.stateData.startTime;
                    // カウントダウンなので1秒、2秒、3秒がハードコーディングされとる。
                    if (3000 < elapsed) {
                        this.state = GameState.MODEL;
                        this.stateData = new ModelData(performance.now());
                        break;
                    }

                    let img = images.countdown1;
                    if (elapsed < 1000) {
                        img = images.countdown3;
                    }
                    else if (elapsed < 2000) {
                        img = images.countdown2;
                    }

                    this.renderer.drawCountDown(img);
                }
                break;

            case GameState.MODEL:
                {
                    const elapsed = performance.now() - this.stateData.startTime;

                    const points = this.stageData.hitpoints();
                    this.renderer.drawStageCount(this.stageData.stages.length, this.stageData.currentStage + 1);
                    this.renderer.drawStage(points);
                    this.renderer.drawModelBar(elapsed / (8000 / 3));

                    if (modelPlayDurationMs < elapsed) {
                        this.state = GameState.PLAY;
                        this.stateData = new PlayData(performance.now());
                        break;
                    }

                    for (let i = points.length - 1; 0 <= i; i--) {
                        if (points[i] < elapsed / modelPlayDurationMs) {
                            if (this.stateData.count < i + 1) {
                                this.stateData.count++;
                                this.audioPlayer.metronome();
                            }
                            break;
                        }
                    }
                }
                break;

            case GameState.PLAY:
                {
                    const elapsed = performance.now() - this.stateData.startTime;

                    this.renderer.drawStageCount(this.stageData.stages.length, this.stageData.currentStage + 1);
                    this.renderer.drawStage(this.stageData.hitpoints());
                    this.renderer.drawPlayBar(elapsed / playDurationMs);

                    if (playDurationMs < elapsed) {
                        this.stageData.currentStage++;

                        // クリア時分岐
                        if (this.stageData.currentStage == this.stageData.stages.length) {
                            this.stateData = new EndData(performance.now());
                            this.state = GameState.END;
                            break;
                        }

                        this.state = GameState.MODEL;
                        this.stateData = new ModelData(performance.now());
                        break;
                    }

                    for (const key of keyInput) {
                        if (KeyCodeToName[key] != null) {
                            this.audioPlayer.clap();

                            // 正解判定
                            const points = this.stageData.hitpoints();
                            let ok = false;
                            for (let i = this.stateData.lastCorrectIndex + 1; i < points.length; i++) {
                                if (Math.abs((elapsed - bufferDurationMs) / modelPlayDurationMs - points[i]) < Config.judgePrecision) {
                                    ok = true;
                                    this.stateData.lastCorrectIndex = i;
                                    break;
                                }
                            }

                            // 得点計算 + 描画用に履歴をpush
                            if (ok) {
                                this.stateData.hit("ok", elapsed / playDurationMs);
                                this.stageData.score += 50;
                            }
                            else {
                                this.stateData.hit("ng", elapsed / playDurationMs);
                                this.stageData.score -= 30;
                            }
                        }
                    }

                    this.renderer.drawPlayPoints(this.stateData.hitpoints);
                }
                break;

            case GameState.END:
                {
                    const elapsed = performance.now() - this.stateData.startTime;
                    // 2秒なのは音源に合わせて適当
                    if (2000 < elapsed) {
                        this.stateData = new ResultData();
                        this.state = GameState.RESULT;
                        break;
                    }

                    this.renderer.drawEnd();
                    if (!this.stateData.whistled) {
                        this.stateData.whistled = true;
                        this.audioPlayer.whistle();
                    }
                }
                break;

            case GameState.RESULT:
                {
                    if (this.stateData.rank == null) {
                        let noteCount = 0;
                        for (const stage of this.stageData.stages) {
                            for (const c of stage.rhythm) {
                                if (c == "o") {
                                    noteCount++;
                                }
                            }
                        }

                        this.stateData.calculateRank(noteCount, this.stageData.score);
                    }

                    this.renderer.drawScore(this.stageData.score);
                    this.renderer.drawRank(this.stateData.rank);
                }
                break;

            default:
                break;

        }
        this.animationId = window.requestAnimationFrame(this.gameLoop);
    }
}
