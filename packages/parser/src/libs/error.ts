export default class ParseError extends Error {
  public message: string;

  public line: number;

  public column: number;

  public source: string;

  constructor(message: string, extra?: { line: number; column: number; source?: string }) {
    super(message);
    this.message = message;
    this.line = extra?.line || 0;
    this.column = extra?.column || 0;
    this.source = extra?.source || '';
  }
}
