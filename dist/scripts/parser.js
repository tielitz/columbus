'use strict';

class AstParser {
    constructor(parser) {
        this.parser = parser;
    }
    parse(code) {
        let ast = new Ast(this.parser.parse(code));

        // check which framework it is
        if (AstHelper.isReactCode(ast)) {
            return new ReactAst(ast.getContents());
        }

        if (AstHelper.isAngularCode(ast)) {
            return new AngularAst(ast.getContents());
        }

        if (AstHelper.isPolymerCode(ast)) {
            return new PolymerAst(ast.getContents());
        }

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
        console.log('[JsxParser] transformed ', transformed.code);
        return transformed.code;
    }
}

class BabelParser {
    transform(code) {
        let transformed = Babel.transform(code, {
            presets: ['es2015']
        });
        console.log('[Babel] transform ', transformed.code);
        return transformed.code;
    }
}