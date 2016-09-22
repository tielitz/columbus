'use strict';

class AstParser {
    constructor(parser) {
        this.parser = parser;
    }
    parse(code) {
        let ast = this.parser.parse(code);
        return new Ast(ast);
    }
    parseReact(code) {
        let ast = this.parser.parse(code);
        return new ReactAst(ast);
    }
    parsePolymer(code) {
        let ast = this.parser.parse(code);
        return new PolymerAst(ast);
    }
    parseAngular(code) {
        let ast = this.parser.parse(code);
        return new AngularAst(ast);
    }
}

class TokenParser {
    constructor(parser) {
        this.parser = parser;
    }
    parse(code) {
        return this.parser.tokenize(code);
    }
}

class JsxParser {
    transform(code) {
        let transformed = Babel.transform(code, {
            presets: ['es2015', 'react']
        });
        return transformed.code;
    }
}