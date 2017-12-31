const Int64 = require("node-int64");

const Lexer = require("../lib/Lexer");
const { Lexeme } = require("../lib/Lexeme");

describe("lexer", () => {
    test("includes an end-of-file marker", () => {
        let tokens = Lexer.scan("");
        expect(tokens.map(t => t.kind)).toEqual([ Lexeme.Eof ]);
    });

    test("ignores tabs and spaces", () => {
        let tokens = Lexer.scan("\t\t  \t     \t");
        expect(tokens.map(t => t.kind)).toEqual([ Lexeme.Eof ]);
    });

    test("retains newlines", () => {
        let tokens = Lexer.scan("\n\n\n");
        expect(tokens.map(t => t.kind)).toEqual([
            Lexeme.Newline,
            Lexeme.Newline,
            Lexeme.Newline,
            Lexeme.Eof
        ]);
    });

    describe("comments", () => { 
        test("ignores everything after `'`", () => {
            let tokens = Lexer.scan("= ' (");
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.Equal, Lexeme.Eof
            ]);
        });

        test("ignores everything after `REM`", () => {
            let tokens = Lexer.scan("= REM (");
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.Equal, Lexeme.Eof
            ]);
        });

        test("ignores everything after `rem`", () => {
            let tokens = Lexer.scan("= rem (");
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.Equal, Lexeme.Eof
            ]);
        });
    }); // comments

    describe("non-literals", () => {
        test("reads parens & braces", () => {
            let tokens = Lexer.scan("(){}");
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.LeftParen,
                Lexeme.RightParen,
                Lexeme.LeftBrace,
                Lexeme.RightBrace,
                Lexeme.Eof
            ])
            expect(tokens.filter(t => !!t.literal).length).toBe(0);
        });

        test("reads operators", () => {
            let tokens = Lexer.scan("^ - + * MOD / \\");

            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.Caret,
                Lexeme.Minus,
                Lexeme.Plus,
                Lexeme.Star,
                Lexeme.Mod,
                Lexeme.Slash,
                Lexeme.Backslash,
                Lexeme.Eof
            ])
            expect(tokens.filter(t => !!t.literal).length).toBe(0);
        });

        test("reads bitshift operators", () => {
            let tokens = Lexer.scan("<< >> <<");
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.LeftShift,
                Lexeme.RightShift,
                Lexeme.LeftShift,
                Lexeme.Eof
            ]);
            expect(tokens.filter(t => !!t.literal).length).toBe(0);
        });

        test("reads comparators", () => {
            let tokens = Lexer.scan("< <= > >= = <>");
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.Less,
                Lexeme.LessEqual,
                Lexeme.Greater,
                Lexeme.GreaterEqual,
                Lexeme.Equal,
                Lexeme.LessGreater,
                Lexeme.Eof
            ]);
            expect(tokens.filter(t => !!t.literal).length).toBe(0);
        });
    }); // non-literals

    describe("string literals", () => {
        test("stores produces string literal tokens", () => {
            let tokens = Lexer.scan(`"hello world"`);
            expect(tokens.map(t => t.kind)).toEqual([
                Lexeme.String,
                Lexeme.Eof
            ])
            expect(tokens[0].literal).toBe("hello world");
        });

        test(`escapes safely escapes " literals`, () => {
            let tokens = Lexer.scan(`"the cat says ""meow"""`);
            expect(tokens[0].kind).toBe(Lexeme.String);
            expect(tokens[0].literal).toBe(`the cat says "meow"`);
        });

        test("produces an error for unterminated strings");
        test("disallows multiline strings");
    }); // string literals

    describe("double literals", () => {
        test("respects '#' suffix", () => {
            let d = Lexer.scan("123#")[0];
            expect(d.kind).toBe(Lexeme.Double);
            expect(d.literal).toBe(123);
        });

        test("forces literals >= 10 digits into doubles", () => {
            let d = Lexer.scan("0000000005")[0];
            expect(d.kind).toBe(Lexeme.Double);
            expect(d.literal).toBe(5);
        });

        test("forces literals with 'D' in exponent into doubles", () => {
            let d = Lexer.scan("2.5d3")[0];
            expect(d.kind).toBe(Lexeme.Double);
            expect(d.literal).toBe(2500);
        });
    });

    describe("float literals", () => {
        test("respects '!' suffix", () => {
            let f = Lexer.scan("0.00000008!")[0];
            expect(f.kind).toBe(Lexeme.Float);
            // Floating precision will make this *not* equal
            expect(f.literal).not.toBe(8e-8);
            expect(f.literal).toBe(Math.fround(0.00000008));
        });

        test("forces literals with a decimal into floats", () => {
            let f = Lexer.scan("1.0")[0];
            expect(f.kind).toBe(Lexeme.Float);
            expect(f.literal).toBe(Math.fround(1000000000000e-12));
        });

        test("forces literals with 'E' in exponent into floats", () => {
            let f = Lexer.scan("2.5e3")[0];
            expect(f.kind).toBe(Lexeme.Float);
            expect(f.literal).toBe(2500);
        });
    });

    describe("long integer literals", () => {
        test("supports hexadecimal literals");
        test("respects '&' suffix", () => {
            let li = Lexer.scan("123&")[0];
            expect(li.kind).toBe(Lexeme.LongInteger);
            expect(li.literal).toEqual(new Int64("123"));
        });
    });

    describe("integer literals", () => {
        test("supports hexadecimal literals");
        test("falls back to a regular integer", () => {
            let i = Lexer.scan("123")[0];
            expect(i.kind).toBe(Lexeme.Integer);
            expect(Number.isInteger(i.literal)).toBe(true);
            expect(i.literal).toBe(123);
        });
    });

    describe("identifiers", () => {
        test("matches single-word reserved words", () => {
            // test just a sample of single-word reserved words for now.
            // if we find any that we've missed 
            let words = Lexer.scan("and or box if else endif return true false");
            expect(words.map(w => w.kind)).toEqual([
                Lexeme.And,
                Lexeme.Or,
                Lexeme.Box,
                Lexeme.If,
                Lexeme.Else,
                Lexeme.EndIf,
                Lexeme.Return,
                Lexeme.True,
                Lexeme.False,
                Lexeme.Eof
            ]);
            expect(words.filter(w => !!w.literal).length).toBe(0);
        });

        test("matches reserved words with silly capitalization", () => {
            let words = Lexer.scan("iF ELSE eNDIf FUncTioN");
            expect(words.map(w => w.kind)).toEqual([
                Lexeme.If,
                Lexeme.Else,
                Lexeme.EndIf,
                Lexeme.Function,
                Lexeme.Eof
            ])
        });

        test("allows alpha-numeric (plus '_') identifiers", () => {
            let identifier = Lexer.scan("_abc_123_")[0];
            expect(identifier.kind).toBe(Lexeme.Identifier);
            expect(identifier.text).toBe("_abc_123_");
        });
    });
}); // lexer
