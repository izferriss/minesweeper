const canvas =
{
    w: 800,
    h: 800,
    bg: "#666666",
    html: document.getElementById("canvas")
}
const stats = 
{
    w: canvas.w,
    h: 40,
    bg: "#666666",
    html: document.getElementById("stats")
}

const ctx = canvas.html.getContext("2d");
const ctx_stats = stats.html.getContext("2d");

var state =
{
    start: false,
    new: true,
    active: false,
    loss: false,
    win: false
}

var fps =
{
    last: 0,
    now: 0,
    count_all: 0,
    count_curr: 0,
    delta: 0,
    rate: 0
}

var cols = 20;
var rows = 20;
var grid;
var bombCount = 75;
var numFlaggedBombs = 0;
var score = 0;
var startTime;
var endTime;

var colors =
{
    flag_bomb: "#ff0000",
    flag_question: "#a020f0",
    cell_1: "#ff6961",
    cell_2: "#ffb480",
    cell_3: "#f8f38d",
    cell_4: "#42d6a4",
    cell_5: "#08cad1",
    cell_6: "#59adf6",
    cell_7: "#9d94ff",
    cell_8: "#c780e8"
}

//Listens for clicks
canvas.html.addEventListener('mouseup', function(e)
{
    var mousePos = getMousePos(canvas, e);

    //left click
    if(e.button == 0 && (state.new || state.active))
    {
        leftClickCell(mousePos);
    }
    //right click
    if(e.button == 2 && state.active)
    {
        rightClickCell(mousePos);
        if(checkWin())
        {
            state.active = false;
            gameOver();
        }
    }
})

canvas.html.addEventListener('dblclick', function(e)
{
    if(e.button == 0 && (state.loss || state.win))
    {
        restart();
    }
})

//Disables context menu on the canvas
canvas.html.addEventListener('contextmenu', function (e) {e.preventDefault();}, false);

class Cell
{
    constructor(i, j)
    {
        this.i = i;
        this.j = j;
        this.w = canvas.w / cols;
        this.h = canvas.h / rows;
        this.x = i * this.w;
        this.y = j * this.h;
        this.show = false;
        this.isBomb = false;
        this.flag =
        {
            none: true,
            bomb: false,
            show: false,
        }
        this.value = 0;
    }

    isInBounds(x, y)
    {
        return (x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h);
    }

    draw()
    {
        ctx.strokeStyle = "white";
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        //If cell is visible
        if(this.show)
        {
            //If a bomb is visible
            if(this.isBomb)
            {
                ctx.fillStyle = "red";
                ctx.fillRect(this.x,  this.y, this.w, this.h);
            }
            //Show cell contents otherwise
            else
            {
                ctx.fillStyle = "black";
                ctx.fillRect(this.x,  this.y, this.w, this.h);

                ctx.font = this.h + "px consolas";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                switch (this.value)
                {
                    case 1:
                        ctx.fillStyle = colors.cell_1;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 2:
                        ctx.fillStyle = colors.cell_2;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 3:
                        ctx.fillStyle = colors.cell_3;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 4:
                        ctx.fillStyle = colors.cell_4;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 5:
                        ctx.fillStyle = colors.cell_5;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 6:
                        ctx.fillStyle = colors.cell_6;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 7:
                        ctx.fillStyle = colors.cell_7;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                    case 8:
                        ctx.fillStyle = colors.cell_8;
                        ctx.fillText(this.value, this.x + this.w/2, this.y + this.h/2);
                        break;
                }
            }
        }
        //If a cell isn't visible
        else
        {
            ctx.font = this.h + "px consolas";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            //check flags
            if(this.flag.bomb)
            {
                ctx.fillStyle = colors.flag_bomb;
                ctx.strokeStyle = "#000000";
                ctx.fillText("!", this.x + this.w/2, this.y + this.h/2);
                ctx.strokeText("!", this.x + this.w/2, this.y + this.h/2);
            }
            if(this.flag.show)
            {
                ctx.fillStyle = colors.flag_question;
                ctx.strokeStyle = "#000000";
                ctx.fillText("?", this.x + this.w/2, this.y + this.h/2);
                ctx.strokeText("?", this.x + this.w/2, this.y + this.h/2);
            }
        }
    }

    reveal()
    {
        this.show = true;
        if(this.value === 0)
        {
            this.floodFill();
        }
    }

    countNeighborBombs()
    {
        //If this is a bomb, give it a value out of range
        if(this.isBomb)
        {
            this.value = -1;
        }
        //Otherwise...
        else
        {
            //for each x neighbor
            for(var xOff = -1; xOff <= 1; xOff++)
            {
                //for each y neighbor
                for(var yOff = -1; yOff <= 1; yOff++)
                {
                    //check to the left and right and up and down
                    var i = this.i + xOff;
                    var j = this.j + yOff;

                    //if a neighbor is in bounds
                    if(i > - 1 && i < cols && j > -1 && j < rows)
                    {
                        var neighbor = grid[i][j];

                        //if the neighbor is a bomb
                        if(neighbor.isBomb)
                        {
                            this.value++;
                        }
                    }
                }
            }
        }

    }

    //recursive function if reveal() is called
    floodFill()
    {
        //Don't process bomb clicks
        if(!this.isBomb)
        {
            //for each x neighbor
            for(var xOff = -1; xOff <= 1; xOff++)
            {
                //for each y neighbor
                for(var yOff = -1; yOff <= 1; yOff++)
                {
                    //check to the left and right and up and down
                    var i = this.i + xOff;
                    var j = this.j + yOff;

                    //If a neighbor is in bounds
                    if(i > - 1 && i < cols && j > -1 && j < rows)
                    {
                        var neighbor = grid[i][j];

                        //if the neighbor isn't shown and isn't a bomb
                        if(!neighbor.isBomb && !neighbor.show && !neighbor.flag.bomb && !neighbor.flag.show)
                        {
                            neighbor.reveal();
                        }
                    }
                }
            }
        }
    }
};


window.onload = function()
{
    canvas.html.setAttribute("width", canvas.w);
    canvas.html.setAttribute("height", canvas.h);
    stats.html.setAttribute("width", stats.w);
    stats.html.setAttribute("height", stats.h);
    grid = create2DArray(cols, rows);
    initializeGrid();
    loop(0);
}


//Main game Loop
function loop(time)
{
    calcFrameRate(time);
    update(fps.delta);
    draw();
    requestAnimationFrame(loop);
}


//Main game loop function for handling inputs
function update(time)
{
    updateScore();
    numFlaggedBombs = countNumFlagged();
}

//Main game loop function for drawing
function draw()
{
    drawClearCanvas();
    drawCanvasBG();
    drawGrid();
    if(state.loss || state.win)
    {
        drawGameOver();
    }
    drawStats();
}

//Calculate the time between this frame and the last and provide FPS
function calcFrameRate(time)
{
    fps.now = performance.now();
    fps.delta = fps.now - fps.last;
    fps.rate = Math.round(1000 / fps.delta);

    fps.last = fps.now;

    fps.count_curr++;
    fps.count_all++;

    if(fps.now > 1000 + fps.last)
    {
        fps.rate = Math.round((fps.count_curr * 1000) / (fps.now - fps.last));
        fps.count_curr = 0;
        fps.last = fps.now; 
    }
}

//Clear canvas every frame
function drawClearCanvas()
{
    ctx.clearRect(0, 0, canvas.w, canvas.h);
    ctx_stats.clearRect(0, 0, stats.w, stats.h);
}

//Fill in canvas bg
function drawCanvasBG()
{
    ctx.fillStyle = canvas.bg;
    ctx.fillRect(0, 0, canvas.w, canvas.h);

    ctx_stats.fillStyle = stats.bg;
    ctx_stats.fillRect(0, 0, stats.w, stats.h);
}



function drawStats()
{
    drawFPS();
    drawScore();
    drawBombCounts();
}

//Show FPS count in the top-left
function drawFPS()
{
    ctx_stats.font = "14px Arial";
    ctx_stats.fillStyle = "black";
    ctx_stats.textAlign = "left";
    ctx_stats.textBaseline = "bottom";
    ctx_stats.fillText("FPS: " + fps.rate, 0, stats.h);
}

function drawScore()
{
    ctx_stats.font = "30px Arial";
    ctx_stats.fillStyle = "black";
    ctx_stats.textAlign = "right";
    ctx_stats.textBaseline = "middle";
    ctx_stats.fillText("Score: " + score, stats.w* .9, stats.h/2);
}

function drawBombCounts()
{
    ctx_stats.font = "14px Arial";
    ctx_stats.fillStyle = "black";
    ctx_stats.textAlign = "left";
    ctx_stats.textBaseline = "bottom";
    ctx_stats.fillText("Bombs flagged: " + numFlaggedBombs, 0, stats.h/2);
    ctx_stats.fillText("Total bombs: " + bombCount, canvas.w/6, stats.h/2);
}

function updateScore()
{
    if(state.active)
    {
        endTime = Date.now();
        score = Math.floor((endTime - startTime) / 1000);
    }
}

//Make a grid
function create2DArray(cols, rows)
{
    var tempArr = new Array(cols);
    for(var i = 0; i < tempArr.length; i++)
    {
        tempArr[i] = new Array(rows);
    }

    return tempArr;
}

//Populate the grid
function initializeGrid()
{
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            grid[i][j] = new Cell(i, j);
        }
    }
}

//Draw all cells
function drawGrid()
{
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            grid[i][j].draw();
        }
    }
}

//get mouse x/y position
function getMousePos(canvas, e) 
{
    var rect = canvas.html.getBoundingClientRect();
    return{x: e.clientX - rect.left, y: e.clientY - rect.top};
}

//Handle left clicks
function leftClickCell(mousePos)
{
    var temp;
    if(state.new)
    {
        state.new = false;
        startTime = Date.now();

        for(var i = 0; i < cols; i++)
        {
            for(var j = 0; j < rows; j++)
            {
                if(grid[i][j].isInBounds(mousePos.x, mousePos.y) && !grid[i][j].show)
                {
                    temp = grid[i][j];
                }
            }
        }
        
        temp.show = true;
        populateCells();
        temp.value = 0;
        temp.reveal();

        state.active = true;
    }
    else if(state.active)
    {
        for(var i = 0; i < cols; i++)
        {
            for(var j = 0; j < rows; j++)
            {
                if(grid[i][j].isInBounds(mousePos.x, mousePos.y) && !grid[i][j].show)
                {
                    grid[i][j].reveal();
                    if(grid[i][j].isBomb)
                    {
                        gameOver();
                    }
                }
            }
        }
    }
}

//Handle right clicks
function rightClickCell(mousePos)
{
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            if(grid[i][j].isInBounds(mousePos.x, mousePos.y) && !grid[i][j].show)
            {
                if(grid[i][j].flag.none)
                {
                    grid[i][j].flag.none = false;
                    grid[i][j].flag.bomb = true;
                    if(checkWin())
                    {
                        gameOver();
                    }
                }
                else if(grid[i][j].flag.bomb)
                {
                    grid[i][j].flag.bomb = false;
                    grid[i][j].flag.show = true;
                }
                else
                {
                    grid[i][j].flag.show = false;
                    grid[i][j].flag.none = true;
                }
            }
        }
    }
}

function populateCells()
{    
    var temp = [];

    //Populate temp array
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            temp.push([i , j]);
        }
    }

    //populate bombs
    for(var n = 0; n < bombCount; n++)
    {
        var rand = Math.floor(Math.random() * temp.length);
        var choice = temp[rand];
        var i = choice[0];
        var j = choice[1];
        if(!grid[i][j].show)
        {
            temp.splice(choice, 1);
            grid[i][j].isBomb = true;
            grid[i][j].value = -1;
        }
    }

    //calculate values of cells
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            grid[i][j].countNeighborBombs();
        }
    }

}

function gameOver()
{
    endTime = Date.now();
    state.active = false;
    if(checkWin())
    {
        score = Math.floor((endTime - startTime) / 1000);
        state.win = true;
    }
    else
    {
        state.loss = true;
        score = 0;
    }
    
    
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            grid[i][j].reveal();
        }
    }
}

function drawGameOver()
{
    //loss
    if(state.loss)
    {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.fillRect(canvas.w * .1, canvas.h * .1, canvas.w * .8, canvas.h * .8);
        ctx.strokeRect(canvas.w * .1, canvas.h * .1, canvas.w * .8, canvas.h  * .8);
        ctx.font = canvas.h * .1 + "px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.w/2, canvas.h/4);

        ctx.font = canvas.h * .03 + "px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Double click to reload", canvas.w/2, canvas.h/4 + 80);
    }
    //win
    if(state.win)
    {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.fillRect(canvas.w * .1, canvas.h * .1, canvas.w * .8, canvas.h * .8);
        ctx.strokeRect(canvas.w * .1, canvas.h * .1, canvas.w * .8, canvas.h  * .8);
        ctx.font = canvas.h * .1 + "px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("WINNER!", canvas.w/2, canvas.h/4);
        ctx.textAlign = "center";
        ctx.font = canvas.h * .05 + "px Arial";
        ctx.fillText("Score: " + score, canvas.w/2, canvas.h/3);
    }
}

function restart()
{
    window.location.reload();
}

function checkWin()
{
    var check = 0;
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            if(grid[i][j].isBomb && grid[i][j].flag.bomb)
            {
                check++;
            }
        }
    }

    if(check != bombCount)
    {
        return false;
    }
    else
    {
        return true;
    }
}

function countNumFlagged()
{
    var count = 0;
    for(var i = 0; i < cols; i++)
    {
        for(var j = 0; j < rows; j++)
        {
            if(grid[i][j].flag.bomb)
            {
                count++;
            }
        }
    }

    return count;
}