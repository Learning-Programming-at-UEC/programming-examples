const WHITE = "#ffffff";
const BLACK = "#000000";
const RED = "#ff0000";
const GREEN = "#00ff00";
const BLUE = "#0000ff";

const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");

let maze_size = 51;
let random_goal = true;
let maze = [];
let maze_copy = [];
let start_y = 0;
let start_x = 0;

let path = [];
let path_num = 1;
let stopped = false;

let rows = 51;
let cols = 51;

let cell_size = Math.round(600 / maze_size);

// ========== 迷路生成 ==========
function generate_maze(maze_size, random_goal) {
    function get_random_int(max) {
        return Math.floor(Math.random() * max);
    }
    const maze = [];
    for (let i = 0; i < maze_size; i++) {
        const maze_row = [];
        if (i === 0 || i === maze_size - 1) {
            for (let j = 0; j < maze_size; j++) {
                maze_row.push(1);
            }
        } else {
            for (let j = 0; j < maze_size; j++) {
                if (j === 0 || j === maze_size - 1) {
                    maze_row.push(1);
                } else {
                    maze_row.push(0);
                }
            }
        }
        maze.push(maze_row);
    }
    const wall = [];
    for (let i = 2; i < maze_size; i += 2) {
        for (let j = 2; j < maze_size; j += 2) {
            if (maze[i][j] === 1) {
                continue;
            }
            maze[i][j] = 1;
            wall.push([i, j]);
            let y = i;
            let x = j;
            let count = 0;
            while (y > 0 && y < maze_size && x > 0 && x < maze_size) {
                count++;
                const move_direction = get_random_int(2);
                let move_y = 0;
                let move_x = 0;
                if (move_direction === 0) {
                    move_y = get_random_int(2) === 1 ? 1 : -1;
                } else {
                    move_x = get_random_int(2) === 1 ? 1 : -1;
                }
                if (
                    maze[y + move_y][x + move_x] === 0 &&
                    !wall.some(
                        (element) =>
                            element[0] === y + move_y * 2 &&
                            element[1] === x + move_x * 2,
                    )
                ) {
                    y += move_y;
                    x += move_x;
                    maze[y][x] = 1;
                    wall.push([y, x]);
                }
                if (
                    maze[y - 1][x] === 1 ||
                    maze[y + 1][x] === 1 ||
                    maze[y][x - 1] === 1 ||
                    maze[y][x + 1] === 1
                ) {
                    break;
                }
            }
        }
    }
    const start_y = 1;
    for (let j = 0; j < maze_size; j++) {
        if (maze[start_y][j] === 0) {
            maze[start_y][j] = 2;
            break;
        }
    }

    if (random_goal) {
        let setting = true;
        while (setting) {
            const r_goal_y = get_random_int(maze_size);
            const r_goal_x = get_random_int(maze_size);
            if (maze[r_goal_y][r_goal_x] === 0) {
                maze[r_goal_y][r_goal_x] = 3;
                setting = false;
            }
        }
    } else {
        const goal_y = maze_size - 2;
        for (let j = 0; j < maze_size; j++) {
            if (maze[goal_y][maze_size - j - 1] === 0) {
                maze[goal_y][maze_size - j - 1] = 3;
                break;
            }
        }
    }
    return maze;
}

// ========== 深さ優先探索 ==========
function dfs(maze, start_y, start_x) {
    const stack = [];
    const visited = [];
    let pos = [start_y, start_x];
    stack.push(pos);
    visited.push(pos);
    const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];
    const explore_path = [];

    let exploring = true;
    while (exploring) {
        pos = stack.pop();

        for (const [dy, dx] of directions) {
            const ny = pos[0] + dy;
            const nx = pos[1] + dx;
            if (
                maze[ny][nx] === 0 &&
                !visited.some(
                    (element) => element[0] === ny && element[1] === nx,
                ) &&
                !stack.some((element) => element[0] === ny && element[1] === nx)
            ) {
                stack.push([ny, nx]);
            } else if (maze[ny][nx] === 3) {
                exploring = false;
            }
        }

        explore_path.push(pos);
        visited.push(pos);
    }

    return explore_path;
}

// ========== 幅優先探索 ==========
function bfs(maze, start_y, start_x) {
    const queue = [];
    const visited = [];
    let pos = [start_y, start_x];
    queue.push(pos);
    visited.push(pos);
    const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];
    const path = [];

    let exploring = true;
    while (exploring) {
        pos = queue.shift();

        for (const [dy, dx] of directions) {
            const ny = pos[0] + dy;
            const nx = pos[1] + dx;
            if (
                maze[ny][nx] === 0 &&
                !visited.some(
                    (element) => element[0] === ny && element[1] === nx,
                ) &&
                !queue.some((element) => element[0] === ny && element[1] === nx)
            ) {
                queue.push([ny, nx]);
            } else if (maze[ny][nx] === 3) {
                exploring = false;
            }
        }

        path.push(pos);
        visited.push(pos);
    }

    return path;
}

// ========== A*探索 ==========
function astar(maze, start_y, start_x) {
    // ゴール座標を見つけておく
    let goal_y = -1;
    let goal_x = -1;
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 3) {
                goal_y = y;
                goal_x = x;
            }
        }
    }

    // ヒューリスティック関数（マンハッタン距離）
    function heuristic(y, x) {
        return Math.abs(y - goal_y) + Math.abs(x - goal_x);
    }

    // オープンリスト（f値でソートされる優先度付きキュー）
    // 各要素: [f, g, y, x]
    const open_list = [];
    const visited = [];
    const g_score = {};

    const start_key = `${start_y},${start_x}`;
    g_score[start_key] = 0;

    let pos = [start_y, start_x];
    const f = heuristic(start_y, start_x);
    open_list.push([f, 0, start_y, start_x]);
    visited.push(pos);
    const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];
    const explore_path = [];

    let exploring = true;
    while (exploring) {
        // f値が最小の要素を取り出す
        open_list.sort((a, b) => a[0] - b[0]);
        const [_f, g, py, px] = open_list.shift();
        pos = [py, px];

        for (const [dy, dx] of directions) {
            const ny = pos[0] + dy;
            const nx = pos[1] + dx;
            const neighbor_key = `${ny},${nx}`;
            const new_g = g + 1;

            if (
                maze[ny][nx] === 0 &&
                !visited.some(
                    (element) => element[0] === ny && element[1] === nx,
                ) &&
                !open_list.some(
                    (element) => element[2] === ny && element[3] === nx,
                )
            ) {
                g_score[neighbor_key] = new_g;
                const f = new_g + heuristic(ny, nx);
                open_list.push([f, new_g, ny, nx]);
            } else if (maze[ny][nx] === 3) {
                exploring = false;
            }
        }

        explore_path.push(pos);
        visited.push(pos);
    }

    return explore_path;
}

function draw() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze_copy[y][x] === 4) {
                ctx.fillStyle = BLUE;
            } else if (maze_copy[y][x] === 3) {
                ctx.fillStyle = GREEN;
            } else if (maze_copy[y][x] === 2) {
                ctx.fillStyle = RED;
            } else if (maze_copy[y][x] === 1) {
                ctx.fillStyle = BLACK;
            } else {
                ctx.fillStyle = WHITE;
            }

            ctx.fillRect(x * cell_size, y * cell_size, cell_size, cell_size);
        }
    }

    if (!stopped && path_num < path.length) {
        maze_copy[path[path_num][0]][path[path_num][1]] = 4;
        path_num++;
    } else if (!stopped) {
        info.textContent = "探索完了";
        stopped = true;
    }
    requestAnimationFrame(draw);
}

function search(algorithm) {
    maze_copy = JSON.parse(JSON.stringify(maze));
    path = [];
    path_num = 1;

    if (algorithm === "dfs") {
        path = dfs(maze_copy, start_y, start_x);
        info.textContent = "DFS探索中...";
    } else if (algorithm === "bfs") {
        path = bfs(maze_copy, start_y, start_x);
        info.textContent = "BFS探索中...";
    } else if (algorithm === "astar") {
        path = astar(maze_copy, start_y, start_x);
        info.textContent = "A*探索中...";
    }

    stopped = false;
    draw();
}

function init() {
    maze = generate_maze(maze_size, random_goal);
    maze_copy = JSON.parse(JSON.stringify(maze));
    rows = maze_size;
    cols = maze_size;
    cell_size = Math.round(600 / maze_size);
    canvas.width = cols * cell_size;
    canvas.height = rows * cell_size;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze_copy[y][x] === 2) {
                start_y = y;
                start_x = x;
            }
        }
    }

    path = [];
    path_num = 0;
    stopped = true;
    info.textContent = "ボタンをクリックして探索開始";
    draw();
}

document.getElementById("new_maze_btn").addEventListener("click", () => {
    init();
});

document.getElementById("dfs_btn").addEventListener("click", () => {
    search("dfs");
});

document.getElementById("bfs_btn").addEventListener("click", () => {
    search("bfs");
});

document.getElementById("astar_btn").addEventListener("click", () => {
    search("astar");
});

document.getElementById("maze_size_select").addEventListener("change", (e) => {
    if (e.target.value) {
        maze_size = parseInt(e.target.value);
        init();
    }
});

init();
