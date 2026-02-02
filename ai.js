class ChessAI {
    constructor(game) {
        this.game = game;
    }

    makeBestMove(depth) {
        const t0 = performance.now();
        const nodes = { count: 0 };

        // Copie des méthodes nécessaires pour éviter des appels lents si possible, 
        // mais JS est assez rapide. On utilise this.game directement.

        const bestMove = this.minimaxRoot(depth, true, nodes);

        const t1 = performance.now();
        console.log(`IA Move: ${JSON.stringify(bestMove)} Nodes: ${nodes.count} Time: ${(t1 - t0).toFixed(2)}ms`);

        return bestMove;
    }

    minimaxRoot(depth, isMaximizing, nodes) {
        // L'IA joue les Noirs (isMaximizing = true pour les noirs ici ? 
        // Convention: White is Max, Black is Min. 
        // Mais "makeBestMove" est appelé pour l'IA. Si IA = Black, elle veut MINIMISER le score (si White +).
        // Simplifions : L'IA veut maximiser SON score.
        // Si l'IA joue les Noirs, on va dire que les pièces Noires ont une valeur positive pour elle.
        // Ou standard : White pos, Black neg. IA (Black) cherche le Minimum.

        // Vérifions la convention d'évaluation.

        const newGameMoves = this.game.getAllLegalMoves('black');

        // Random move if no moves (mat/pat) - handled by game over check usually
        if (newGameMoves.length === 0) return null;

        let bestMove = -9999;
        let bestMoveFound = newGameMoves[0];

        for (let i = 0; i < newGameMoves.length; i++) {
            const move = newGameMoves[i];
            this.game.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);

            // Après le coup noir, c'est aux blancs (minimizing for black AI if simple negamax? No standard minimax)
            // Si IA = Black seeking min score (standard):
            // value = minimax(depth - 1, alpha, beta, true (isWhite))
            // Si IA = Maximizing own score (Black pieces positive), then call minimize for White.

            // Convention choisie: 
            // Score = (Material White - Material Black).
            // White wants Max, Black wants Min.
            // Donc si IA est Black, elle cherche le Minimum.

            const value = this.minimax(depth - 1, -10000, 10000, true, nodes);

            // Undo
            this.undoMove(move);

            if (value <= bestMove) { // On cherche le plus petit score (car on est Black)
                // Attendez, init bestMove à +9999 alors
            }
        }

        // RESTART avec convention claire :
        // IA (Black) veut minimiser le score (White - Black).

        let bestVal = 10000;
        let bestMv = null;

        // Trier les coups pour optimiser ? (Prises d'abord)

        for (const move of newGameMoves) {
            this.game.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
            const val = this.minimax(depth - 1, -10000, 10000, true, nodes); // Next is White (Max)
            this.undoMove(move);

            if (val < bestVal) {
                bestVal = val;
                bestMv = move;
            }
        }
        return bestMv;
    }

    minimax(depth, alpha, beta, isMaximizing, nodes) {
        nodes.count++;
        if (depth === 0) {
            return this.evaluateBoard();
        }

        const possibleMoves = this.game.getAllLegalMoves(isMaximizing ? 'white' : 'black');

        if (possibleMoves.length === 0) {
            // Checkmate or Stalemate
            if (this.game.isCheck(isMaximizing ? 'white' : 'black')) {
                // Mat
                return isMaximizing ? -10000 : 10000;
            }
            return 0; // Pat
        }

        if (isMaximizing) { // White
            let bestVal = -10000;
            for (const move of possibleMoves) {
                this.game.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
                const val = this.minimax(depth - 1, alpha, beta, false, nodes);
                this.undoMove(move);
                bestVal = Math.max(bestVal, val);
                alpha = Math.max(alpha, bestVal);
                if (beta <= alpha) return bestVal;
            }
            return bestVal;
        } else { // Black
            let bestVal = 10000;
            for (const move of possibleMoves) {
                this.game.makeMove(move.from.r, move.from.c, move.to.r, move.to.c);
                const val = this.minimax(depth - 1, alpha, beta, true, nodes);
                this.undoMove(move);
                bestVal = Math.min(bestVal, val);
                beta = Math.min(beta, bestVal);
                if (beta <= alpha) return bestVal;
            }
            return bestVal;
        }
    }

    // Ajout d'une méthode undoMove dans Game ou simulation ici ?
    // Le "makeMove" de Game est destructif et change l'historique et le tour.
    // Il faut une méthode undo dans Game, ou simuler manuellement.
    // Comme j'utilise la classe Game existante, je dois ajouter undoMove dans Game ou le simuler.
    // Je vais ajouter undoMove à l'IA en manipulant le board direct, mais c'est risqué car makeMove fait des trucs (promotion auto).
    // Mieux : Ajouter undo() à Game. Je vais le faire via "replace" dans chess.js ou ici si je peux.
    // Pour l'instant, je vais implémenter un undo "manuel" ici qui inverse le dernier coup de l'historique.

    undoMove(move) {
        // move contains: from, to, piece, captured
        // Restore piece at from
        this.game.board[move.from.r][move.from.c] = move.piece; // Attention si c'était un pion promu, piece est 'bQ'. 
        // Ah, makeMove stocke 'piece' qui est celle qui arrive. Si promotion, c'est la nouvelle.
        // Il faut savoir si c'était un pion avant.
        // Simplification: Je vais vérifier si piece est Q et from/to sont positions de promo.
        // C'est un peu hacky sans un vrai système de Move complet.

        // CORRECTION: Pour l'IA, je dois stocker l'état exact ou avoir un vrai Undo.
        // Je vais modifier chess.js pour ajouter undoMove(), c'est plus propre.

        // Mais je ne peux pas modifier chess.js dans ce block replace.
        // Je vais supposer que je vais ajouter undoMove() à ChessGame tout de suite après.
        this.game.undoMove();
    }

    evaluateBoard() {
        let total = 0;
        const values = {
            'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
        };

        // Piece Square Tables (Simplified)
        // Flips for black are handled by reading the table backwards or mapping coords.
        // Here we define for White (bottom), and for Black we mirror Rows.

        const pst = {
            'P': [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5, 5, 10, 25, 25, 10, 5, 5],
                [0, 0, 0, 20, 20, 0, 0, 0],
                [5, -5, -10, 0, 0, -10, -5, 5],
                [5, 10, 10, -20, -20, 10, 10, 5],
                [0, 0, 0, 0, 0, 0, 0, 0]
            ],
            'N': [
                [-50, -40, -30, -30, -30, -30, -40, -50],
                [-40, -20, 0, 0, 0, 0, -20, -40],
                [-30, 0, 10, 15, 15, 10, 0, -30],
                [-30, 5, 15, 20, 20, 15, 5, -30],
                [-30, 0, 15, 20, 20, 15, 0, -30],
                [-30, 5, 10, 15, 15, 10, 5, -30],
                [-40, -20, 0, 5, 5, 0, -20, -40],
                [-50, -40, -30, -30, -30, -30, -40, -50]
            ],
            'B': [
                [-20, -10, -10, -10, -10, -10, -10, -20],
                [-10, 0, 0, 0, 0, 0, 0, -10],
                [-10, 0, 5, 10, 10, 5, 0, -10],
                [-10, 5, 5, 10, 10, 5, 5, -10],
                [-10, 0, 10, 10, 10, 10, 0, -10],
                [-10, 10, 10, 10, 10, 10, 10, -10],
                [-10, 5, 0, 0, 0, 0, 5, -10],
                [-20, -10, -10, -10, -10, -10, -10, -20]
            ],
            'R': [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [5, 10, 10, 10, 10, 10, 10, 5],
                [-5, 0, 0, 0, 0, 0, 0, -5],
                [-5, 0, 0, 0, 0, 0, 0, -5],
                [-5, 0, 0, 0, 0, 0, 0, -5],
                [-5, 0, 0, 0, 0, 0, 0, -5],
                [-5, 0, 0, 0, 0, 0, 0, -5],
                [0, 0, 0, 5, 5, 0, 0, 0]
            ],
            'Q': [
                [-20, -10, -10, -5, -5, -10, -10, -20],
                [-10, 0, 0, 0, 0, 0, 0, -10],
                [-10, 0, 5, 5, 5, 5, 0, -10],
                [-5, 0, 5, 5, 5, 5, 0, -5],
                [0, 0, 5, 5, 5, 5, 0, -5],
                [-10, 5, 5, 5, 5, 5, 0, -10],
                [-10, 0, 5, 0, 0, 0, 0, -10],
                [-20, -10, -10, -5, -5, -10, -10, -20]
            ],
            'K': [
                [-30, -40, -40, -50, -50, -40, -40, -30],
                [-30, -40, -40, -50, -50, -40, -40, -30],
                [-30, -40, -40, -50, -50, -40, -40, -30],
                [-30, -40, -40, -50, -50, -40, -40, -30],
                [-20, -30, -30, -40, -40, -30, -30, -20],
                [-10, -20, -20, -20, -20, -20, -20, -10],
                [20, 20, 0, 0, 0, 0, 20, 20],
                [20, 30, 10, 0, 0, 10, 30, 20]
            ]
        };

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.game.board[r][c];
                if (!p) continue;

                const type = p[1]; // P, N, B, R, Q, K (case sensitive from board but we normalized in chess.js ? No wait, board uses bR/wP)
                // Board uses 'bR', 'wP'. So p[1] is uppercase.

                const color = p[0];
                const val = values[type.toLowerCase()] || 0;

                let positionBonus = 0;
                if (pst[type]) {
                    if (color === 'w') {
                        // White uses table as is (0 = top, 7 = bottom ? No, usually 0=rank8, 7=rank1. 
                        // Our board: 0 is top (Black start), 7 is bottom (White start).
                        // So for White, rank 7 is "home". 
                        // The PST above seem defined as: [0] = Top (promotion for white / home for black).
                        // Wait, 'P' table has [0] as 0s (promotion rank?) and [1] as 50s (rank 7).
                        // If 0 is top of screen (row 0), that is Black home.
                        // White pawns move 6 -> 0.
                        // So row 1 (index 1) checks '50'. This is good for white pawn (near promo)?
                        // No, usually Pawn table is: Rank 7 (start) = 0, Rank 0 (promo) = High.

                        // Let's assume the tables above are "White Orientation": [0] is Rank 8 (Top), [7] is Rank 1 (Bottom).
                        // So for White Piece at board[r][c]:
                        // Use pst[type][r][c].
                        // E.g. White Pawn at r=1: pst[1] = 50. Good! It's close to promo.
                        positionBonus = pst[type][r][c];
                    } else {
                        // Black: Mirror Rows. 
                        // Black Pawn at r=6 (close to promo): should use row 1 value (50).
                        // So we use pst[7-r][c]. // Mirror vertically
                        positionBonus = pst[type][7 - r][c];
                    }
                }

                if (color === 'w') total += (val + positionBonus);
                else total -= (val + positionBonus);
            }
        }
        return total;
    }
}
