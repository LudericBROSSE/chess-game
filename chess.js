class ChessGame {
    constructor() {
        this.board = []; // 8x8 grid
        this.turn = 'white'; // 'white' or 'black'
        this.history = [];
        this.isGameOver = false;
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };

        this.resetGame();
    }

    resetGame() {
        this.turn = 'white';
        this.isGameOver = false;
        this.history = [];
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.setupBoard();
    }

    setupBoard() {
        // Initialisation standard du plateau
        // Représentation : 'wP' (white Pawn), 'bR' (black Rook), etc., ou null pour vide
        const setup = [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];
        // Copie profonde pour éviter les références
        this.board = setup.map(row => [...row]);
    }

    // Vérifie si une case est sur le plateau
    isOnBoard(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // Retourne l'équipe d'une pièce ('white', 'black' ou null)
    getPieceColor(piece) {
        if (!piece) return null;
        return piece[0] === 'w' ? 'white' : 'black';
    }

    getPieceType(piece) {
        if (!piece) return null;
        return piece[1];
    }

    // Retourne les coups PSEUDO-légaux (sans vérifier l'échec)
    getPseudoLegalMoves(r, c) {
        // CORRECTION: On doit pouvoir générer les coups même si le jeu est fini pour vérifier le MAT/PAT
        // if (this.isGameOver) return []; 

        const piece = this.board[r][c];
        if (!piece) return [];

        const moves = [];
        const type = this.getPieceType(piece);
        const color = this.getPieceColor(piece);

        const directions = {
            'R': [[0, 1], [0, -1], [1, 0], [-1, 0]],
            'B': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            'N': [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]],
            'Q': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
            'K': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
        };

        const addMoveIfValid = (tr, tc) => {
            if (!this.isOnBoard(tr, tc)) return false;
            const target = this.board[tr][tc];
            if (!target) {
                moves.push({ r: tr, c: tc });
                return true; // Continue sliding
            } else if (this.getPieceColor(target) !== color) {
                moves.push({ r: tr, c: tc });
                return false; // Stop sliding (capture)
            }
            return false; // Stop sliding (blocked by friendly)
        };

        if (type === 'P') {
            const direction = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;

            // Avance simple
            if (this.isOnBoard(r + direction, c) && !this.board[r + direction][c]) {
                moves.push({ r: r + direction, c: c });
                // Avance double au départ
                if (r === startRow && !this.board[r + 2 * direction][c]) {
                    moves.push({ r: r + 2 * direction, c: c });
                }
            }

            // Prise en diagonale
            [[direction, 1], [direction, -1]].forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                if (this.isOnBoard(tr, tc)) {
                    const target = this.board[tr][tc];
                    if (target && this.getPieceColor(target) !== color) {
                        moves.push({ r: tr, c: tc });
                    }
                }
            });
        }
        else if (['R', 'B', 'Q'].includes(type)) {
            directions[type].forEach(([dr, dc]) => {
                let tr = r + dr;
                let tc = c + dc;
                while (addMoveIfValid(tr, tc)) {
                    tr += dr;
                    tc += dc;
                }
            });
        }
        else if (type === 'N' || type === 'K') {
            directions[type].forEach(([dr, dc]) => {
                addMoveIfValid(r + dr, c + dc);
            });
        }

        // --- LOGIQUE DU ROQUE (CASTLING) ---
        if (type === 'K') {
            const row = color === 'white' ? 7 : 0;
            const rights = this.castlingRights[color];

            // Si on est à la bonne ligne et pas en échec
            if (r === row && c === 4 && !this.isCheck(color)) {

                // Petit Roque (Kingside)
                if (rights.kingSide) {
                    if (!this.board[row][5] && !this.board[row][6]) {
                        // Vérifier que les cases de passage ne sont pas attaquées
                        if (!this.isSquareAttacked(row, 5, color) && !this.isSquareAttacked(row, 6, color)) {
                            moves.push({ r: row, c: 6, isCastling: true, side: 'king' });
                        }
                    }
                }

                // Grand Roque (Queenside)
                if (rights.queenSide) {
                    if (!this.board[row][3] && !this.board[row][2] && !this.board[row][1]) {
                        // Vérifier que les cases de passage ne sont pas attaquées (seulement c et d pour le roi)
                        // Note: b1/b8 peut être attaqué, le roi ne passe pas par là, il atterrit en c1/c8
                        // Le roi passe par d1 (3) et finit en c1 (2)
                        if (!this.isSquareAttacked(row, 3, color) && !this.isSquareAttacked(row, 2, color)) {
                            moves.push({ r: row, c: 2, isCastling: true, side: 'queen' });
                        }
                    }
                }
            }
        }

        return moves;
    }

    // Nouvelle méthode pour vérifier si une case est attaquée par l'adversaire
    isSquareAttacked(r, c, allyColor) {
        const enemyColor = allyColor === 'white' ? 'black' : 'white';
        // Similaire à isCheck mais pour une case spécifique
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const p = this.board[i][j];
                if (p && this.getPieceColor(p) === enemyColor) {
                    // Attention récursion infinie si on appelle getPseudoLegalMoves -> isCastling -> isSquareAttacked -> getPseudoLegalMoves
                    // Pour éviter ça : getPseudoLegalMoves "de base" ne doit pas appeler isSquareAttacked (c'est fait dans le bloc 'K' seulement)
                    // Mais ici on simule les coups ennemis. Si l'ennemi est un Roi, il ne check pas le roque (car déjà calculé ou pas pertinent pour l'attaque pure).
                    // On peut simplifier : un Roi ennemi attaque-t-il cette case ? Oui si adjacent.

                    const type = this.getPieceType(p);
                    if (type === 'P') {
                        // Logique pion spécifique attaque
                        const direction = enemyColor === 'white' ? -1 : 1;
                        if ((r === i + direction) && (Math.abs(c - j) === 1)) return true;
                    } else if (type === 'K') {
                        if (Math.abs(r - i) <= 1 && Math.abs(c - j) <= 1) return true;
                    } else {
                        // Pour les autres pièces (R, B, Q, N), on peut réutiliser getPseudoLegalMoves de base
                        // Mais il faut ignorer la partie 'K' roque pour éviter la boucle.
                        // Hack: getPseudoLegalMoves ne fait le roque que si type === 'K' ET r === startRow.
                        // Ici on appelle getPseudoLegalMoves pour l'ennemi. Si l'ennemi est un Roi, il va re-vérifier isSquareAttacked?
                        // Non, car un Roi ne peut pas attaquer à distance de Roque.
                        // Le seul risque est si isSquareAttacked appelle getPseudoLegalMoves qui appelle isSquareAttacked.
                        // Dans getPseudoLegalMoves, on appelle isSquareAttacked SEULEMENT si type === K et pour le roque.
                        // Donc si on vérifie l'attaque d'une case par un Roi adverse, on appelle getPseudoLegalMoves(RoiAdverse).
                        // Lui va vérifier s'il peut roquer... et appeler isSquareAttacked. BOUCLE.

                        // SOLUTION: Ne pas utiliser getPseudoLegalMoves pour le Roi adverse ici, juste la distance.
                        // Déjà fait pour le Roi au-dessus.
                        // Donc pour les autres :
                        const moves = this.getPseudoLegalMoves(i, j);
                        // Filtrer les coups 'isCastling' de l'ennemi (ils ne comptent pas comme attaque de case)
                        if (moves.some(m => m.r === r && m.c === c && !m.isCastling)) return true;
                    }
                }
            }
        }
        return false;
    }

    getLegalMoves(r, c) {
        if (this.isGameOver) return [];
        const piece = this.board[r][c];
        if (!piece || this.getPieceColor(piece) !== this.turn) return [];

        const pseudoMoves = this.getPseudoLegalMoves(r, c);
        const legalMoves = [];

        for (const move of pseudoMoves) {
            // Simuler le coup
            const savedTarget = this.board[move.r][move.c];
            this.board[move.r][move.c] = piece;
            this.board[r][c] = null;

            // Gestion spéciale simulation Roque (pour voir si le Roi est en échec A LA FIN ?)
            // Le roque vérifie déjà si on passe par des cases attaquées.
            // Mais il faut vérifier que le Roi n'est pas en échec à l'arrivée.
            // Note: Si on roque, la tour bouge aussi. Faut-il simuler la tour ?
            // L'échec du roi dépend de sa position.

            if (move.isCastling) {
                // Pour le roque, on a déjà vérifié le chemin. Reste juste l'arrivée.
                // On a déplacé le Roi virtuellement.
            }

            if (!this.isCheck(this.turn)) {
                legalMoves.push(move);
            }

            // Annuler le coup
            this.board[r][c] = piece;
            this.board[move.r][move.c] = savedTarget;
        }

        return legalMoves;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const legalMoves = this.getLegalMoves(fromRow, fromCol);
        const moveObj = legalMoves.find(move => move.r === toRow && move.c === toCol);

        if (!moveObj) {
            console.warn("Illegal move attempted!", fromRow, fromCol, toRow, toCol);
            return false;
        }

        const piece = this.board[fromRow][fromCol];
        const target = this.board[toRow][toCol];
        const type = this.getPieceType(piece);
        const color = this.getPieceColor(piece);

        // Sauvegarde de l'état Castling Rights
        const prevCastlingRights = JSON.parse(JSON.stringify(this.castlingRights));

        // Exécution du coup
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Gérer le mouvement de la Tour pour le Roque
        if (moveObj.isCastling) {
            if (moveObj.side === 'king') { // Petit Roque
                const rookRow = toRow;
                const rookFromCol = 7;
                const rookToCol = 5;
                const rook = this.board[rookRow][rookFromCol];
                this.board[rookRow][rookToCol] = rook;
                this.board[rookRow][rookFromCol] = null;
            } else { // Grand Roque
                const rookRow = toRow;
                const rookFromCol = 0;
                const rookToCol = 3;
                const rook = this.board[rookRow][rookFromCol];
                this.board[rookRow][rookToCol] = rook;
                this.board[rookRow][rookFromCol] = null;
            }
        }

        // Promotion Dame auto
        let movedPiece = piece;
        if (type === 'P') {
            if ((color === 'white' && toRow === 0) || (color === 'black' && toRow === 7)) {
                movedPiece = color[0] + 'Q';
                this.board[toRow][toCol] = movedPiece;
            }
        }

        // --- MISE A JOUR DES DROITS DE ROQUE ---
        // Si le Roi bouge, on perd tout
        if (type === 'K') {
            this.castlingRights[color].kingSide = false;
            this.castlingRights[color].queenSide = false;
        }
        // Si une Tour bouge (ou est capturée ? Non, si elle bouge)
        if (type === 'R') {
            if (fromRow === 0 && fromCol === 0) this.castlingRights.black.queenSide = false;
            if (fromRow === 0 && fromCol === 7) this.castlingRights.black.kingSide = false;
            if (fromRow === 7 && fromCol === 0) this.castlingRights.white.queenSide = false;
            if (fromRow === 7 && fromCol === 7) this.castlingRights.white.kingSide = false;
        }
        // Si une Tour est capturée (côté cible)
        if (target && this.getPieceType(target) === 'R') {
            if (toRow === 0 && toCol === 0) this.castlingRights.black.queenSide = false;
            if (toRow === 0 && toCol === 7) this.castlingRights.black.kingSide = false;
            if (toRow === 7 && toCol === 0) this.castlingRights.white.queenSide = false;
            if (toRow === 7 && toCol === 7) this.castlingRights.white.kingSide = false;
        }

        this.history.push({
            from: { r: fromRow, c: fromCol },
            to: { r: toRow, c: toCol },
            piece: movedPiece,
            originalPiece: piece, // Le type original avant promo
            captured: target,
            isCastling: moveObj.isCastling,
            castlingSide: moveObj.side,
            prevCastlingRights: prevCastlingRights
        });

        // Changer le tour
        this.turn = this.turn === 'white' ? 'black' : 'white';

        // Vérifier Fin de partie
        // Si aucune coup légal possible pour le joueur actif
        if (this.getAllLegalMoves(this.turn).length === 0) {
            this.isGameOver = true; // Mat ou Pat sera distingué par l'UI via isCheck
        }

        return true;
    }

    undoMove() {
        const lastMove = this.history.pop();
        if (!lastMove) return;

        const { from, to, piece, originalPiece, captured, isCastling, castlingSide, prevCastlingRights } = lastMove;

        // Restore basic move
        this.board[from.r][from.c] = originalPiece;
        this.board[to.r][to.c] = captured;

        // Restore rook if castling
        if (isCastling) {
            if (castlingSide === 'king') {
                const rookRow = to.r;
                const rook = this.board[rookRow][5];
                this.board[rookRow][7] = rook;
                this.board[rookRow][5] = null;
            } else {
                const rookRow = to.r;
                const rook = this.board[rookRow][3];
                this.board[rookRow][0] = rook;
                this.board[rookRow][3] = null;
            }
        }

        // Restore castling rights
        this.castlingRights = prevCastlingRights;

        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.isGameOver = false;
    }

    // Vérifie si le roi de la couleur 'color' est en échec
    isCheck(color) {
        // Trouver le roi
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === color[0] + 'K') {
                    kingPos = { r, c };
                    break;
                }
            }
            if (kingPos) break;
        }
        if (!kingPos) return true; // Pas de roi ? (ne devrait pas arriver)

        // On peut utiliser isSquareAttacked maintenant !
        return this.isSquareAttacked(kingPos.r, kingPos.c, color);
    }

    getAllLegalMoves(color) {
        let allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p && this.getPieceColor(p) === color) {
                    const moves = this.getLegalMoves(r, c);
                    moves.forEach(m => allMoves.push({ from: { r, c }, to: m }));
                }
            }
        }
        return allMoves;
    }

    isCheckmate() {
        return this.isGameOver && this.isCheck(this.turn);
    }
}
