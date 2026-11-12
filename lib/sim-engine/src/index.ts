/**
 * SimDouane calculation engine, shared by the web app (instant result in the
 * browser) and the API server (which recomputes the totals of every saved
 * simulation instead of trusting the ones sent by the browser).
 *
 * The formulas in calculator.ts were moved here unchanged from
 * artifacts/simdouane/src/lib/calculator.ts; test/calculator.test.ts pins
 * their results.
 *
 * grid.ts lists every rate and fee the engine applies, with its source and
 * status (phases S4 and S5); test/grid.test.ts checks it matches calculator.ts.
 */
export * from "./calculator";
export * from "./grid";
