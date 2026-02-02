// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
    const ai = new ChessAI(game);
    const ui = new ChessUI(game, ai);

    // Pour débogage
    window.game = game;
    window.ai = ai;
    window.ui = ui;
});
