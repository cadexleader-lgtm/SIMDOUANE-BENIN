/**
 * SimDouane calculation engine, shared by the web app (instant result in the
 * browser) and the API server (which recomputes the totals of every saved
 * simulation instead of trusting the ones sent by the browser).
 *
 * The formulas in calculator.ts were moved here unchanged from
 * artifacts/simdouane/src/lib/calculator.ts; test/calculator.test.ts pins
 * their results.
 */
export * from "./calculator";
