const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 10;

class Game {
    constructor(player1, player2, onGameOver) {
        this.player1 = player1;
        this.player2 = player2;
        this.onGameOver = onGameOver;
        this.isOver = false;

        this.ball = {
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            dx: 5,
            dy: 5,
            radius: BALL_RADIUS,
        };

        this.paddles = {
            [this.player1.id]: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
            [this.player2.id]: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
        };

        this.score = { [this.player1.id]: 0, [this.player2.id]: 0 };
        this.interval = null;
    }

    broadcast(type, payload) {
        const message = JSON.stringify({ type, payload });
        // Check readyState to prevent errors if a socket closes during broadcast
        if (this.player1.socket.readyState === 1) {
            this.player1.socket.send(message);
        }
        if (this.player2.socket.readyState === 1) {
            this.player2.socket.send(message);
        }
    }

    update() {
        // Move the ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Wall collision (top/bottom)
        if (
            this.ball.y + this.ball.radius > CANVAS_HEIGHT ||
            this.ball.y - this.ball.radius < 0
        ) {
            this.ball.dy *= -1;
        }

        // Paddle positions
        const paddle1Y = this.paddles[this.player1.id].y;
        const paddle2Y = this.paddles[this.player2.id].y;

        // Player 1 paddle collision
        if (
            this.ball.dx < 0 &&
            this.ball.x - this.ball.radius <= PADDLE_WIDTH &&
            this.ball.y > paddle1Y &&
            this.ball.y < paddle1Y + PADDLE_HEIGHT
        ) {
            this.ball.dx *= -1;
        }

        // Player 2 paddle collision
        if (
            this.ball.dx > 0 &&
            this.ball.x + this.ball.radius >= CANVAS_WIDTH - PADDLE_WIDTH &&
            this.ball.y > paddle2Y &&
            this.ball.y < paddle2Y + PADDLE_HEIGHT
        ) {
            this.ball.dx *= -1;
        }

        // Score points
        if (this.ball.x + this.ball.radius < 0) {
            this.score[this.player2.id]++;
            this.resetBall();
        } else if (this.ball.x - this.ball.radius > CANVAS_WIDTH) {
            this.score[this.player1.id]++;
            this.resetBall();
        }

        if (
            this.score[this.player1.id] >= 11 ||
            this.score[this.player2.id] >= 11
        ) {
            this.stop();
            return;
        }

        this.broadcast("gameState", {
            paddles: this.paddles,
            ball: this.ball,
            score: this.score,
        });
    }

    resetBall() {
        this.ball.x = CANVAS_WIDTH / 2;
        this.ball.y = CANVAS_HEIGHT / 2;
        this.ball.dx *= -1;
    }

    handlePlayerInput(playerId, data) {
        if (this.paddles[playerId]) {
            this.paddles[playerId].y = data.y;
        }
    }

    start() {
        this.broadcast("gameStart", {
            player1: { id: this.player1.id, name: this.player1.name },
            player2: { id: this.player2.id, name: this.player2.name },
        });
        this.interval = setInterval(() => this.update(), 1000 / 60);
    }

    stop(forfeitWinnerId = null) {
        if (this.isOver) return;
        this.isOver = true;
        clearInterval(this.interval);

        const winnerId = forfeitWinnerId ||
            (this.score[this.player1.id] >= 11
                ? this.player1.id
                : this.player2.id);
        const loserId = winnerId === this.player1.id
            ? this.player2.id
            : this.player1.id;

        this.broadcast("gameOver", { winnerId, score: this.score });

        if (this.onGameOver) {
            this.onGameOver(winnerId, loserId);
        }
    }
}

module.exports = Game;
