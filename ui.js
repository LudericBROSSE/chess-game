class ChessUI {
    constructor(game, ai) {
        this.game = game;
        this.ai = ai;
        this.boardElement = document.getElementById('board');
        this.statusElement = document.getElementById('status');
        this.selectedSquare = null; // {r, c}

        this.init();
    }

    init() {
        this.renderBoard();
        this.setupEventListeners();
    }

    renderBoard() {
        this.boardElement.innerHTML = '';

        let lastMove = null;
        if (this.game.history.length > 0) {
            lastMove = this.game.history[this.game.history.length - 1];
        }

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;

                // Highlight last move
                if (lastMove) {
                    if ((lastMove.from.r === r && lastMove.from.c === c) ||
                        (lastMove.to.r === r && lastMove.to.c === c)) {
                        square.style.backgroundColor = 'rgba(255, 255, 50, 0.5)'; // Utiliser var CSS si possible mais inline ok
                    }
                }

                square.dataset.row = r;
                square.dataset.col = c;

                const piece = this.game.board[r][c];
                if (piece) {
                    const pieceSpan = document.createElement('span');
                    pieceSpan.className = `piece ${piece[0] === 'w' ? 'white' : 'black'}`;
                    pieceSpan.textContent = this.getPieceChar(piece);
                    square.appendChild(pieceSpan);
                }

                this.boardElement.appendChild(square);
            }
        }
        this.updateStatus();
    }

    getPieceChar(code) {
        const icons = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        return icons[code] || '';
    }

    setupEventListeners() {
        this.boardElement.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            const r = parseInt(square.dataset.row);
            const c = parseInt(square.dataset.col);

            // Si une pièce est déjà sélectionnée
            if (this.selectedSquare) {
                // Si on clique sur la même case, on désélectionne
                if (this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    this.clearSelection();
                    return;
                }

                // Essayer de jouer le coup
                const success = this.game.makeMove(
                    this.selectedSquare.r,
                    this.selectedSquare.c,
                    r,
                    c
                );

                if (success) {
                    this.clearSelection();
                    this.renderBoard(); // Mise à jour complète
                    this.checkGameState();

                    // Tour de l'IA après un court délai
                    if (!this.game.isGameOver && this.game.turn === 'black') {
                        setTimeout(() => this.playAITurn(), 100);
                    }
                } else {
                    // Si le coup est invalide, peut-être qu'on sélectionne une autre pièce de notre couleur
                    const piece = this.game.board[r][c];
                    if (piece && this.game.getPieceColor(piece) === this.game.turn) {
                        this.selectSquare(r, c);
                    } else {
                        this.clearSelection();
                    }
                }
            } else {
                // Sélectionner une pièce
                const piece = this.game.board[r][c];
                if (piece && this.game.getPieceColor(piece) === this.game.turn) {
                    this.selectSquare(r, c);
                }
            }
        });

        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.game.resetGame();
            this.clearSelection();
            this.renderBoard();
            this.updateStatus();
        });

        document.getElementById('difficulty').addEventListener('change', (e) => {
            // TODO: Mettre à jour la difficulté de l'IA
            console.log("Difficulté changée vers : " + e.target.value);
        });
    }

    updateStatus() {
        const turnText = this.game.turn === 'white' ? 'Blancs' : 'Noirs';
        this.statusElement.textContent = `C'est aux ${turnText} de jouer`;
    }

    selectSquare(r, c) {
        this.clearSelection();
        this.selectedSquare = { r, c };

        // Mettre en évidence la case sélectionnée
        const squareIndex = r * 8 + c;
        this.boardElement.children[squareIndex].classList.add('selected'); // Ajouter style CSS si besoin
        this.boardElement.children[squareIndex].style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Highlight rapide

        // Montrer les coups possibles
        const moves = this.game.getLegalMoves(r, c);
        moves.forEach(move => {
            const idx = move.r * 8 + move.c;
            const targetSquare = this.boardElement.children[idx];

            const hint = document.createElement('div');
            hint.className = 'hint';
            targetSquare.appendChild(hint);

            // Si capture possible, ajouter classe spéciale
            if (this.game.board[move.r][move.c]) {
                targetSquare.classList.add('capture-hint');
            }
        });
    }

    clearSelection() {
        this.selectedSquare = null;
        // Nettoyer les styles
        const squares = Array.from(this.boardElement.children);
        squares.forEach(sq => {
            sq.style.backgroundColor = ''; // Reset inline style
            sq.classList.remove('selected', 'capture-hint');
            const hint = sq.querySelector('.hint');
            if (hint) hint.remove();
        });
    }

    checkGameState() {
        if (this.game.isGameOver) {
            if (this.game.isCheck(this.game.turn)) {
                this.statusElement.textContent = this.game.turn === 'white' ? "Échec et Mat ! Les Noirs gagnent." : "Échec et Mat ! Les Blancs gagnent.";
            } else {
                this.statusElement.textContent = "Pat ! Match nul.";
            }
        } else {
            this.updateStatus();
        }
    }

    playAITurn() {
        // Simple appel à l'IA
        const difficulty = document.getElementById('difficulty').value;
        const move = this.ai.makeBestMove(parseInt(difficulty));
        if (move) {
            this.game.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
            this.renderBoard();
            this.checkGameState();
        }
    }
}
