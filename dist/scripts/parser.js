'use strict';

/**
 * Compiles the source code into a framework specific AST
 */
class AstParser {

    /**
     * @param  {Esprima} parser Esprima parsing library
     */
    constructor(parser) {
        this.parser = parser;
    }

    /**
     * Compiles the source code into a framework specific AST by checking
     * which type of component definition exists.
     *
     * @param  {string} code The source code which should be processed
     * @return {Ast}         Compiled Ast
     */
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
}


/**
 * Tokenises the source code
 */
class TokenParser {

    /**
     * @param  {Esprima} parser Esprima parsing library
     */
    constructor(parser) {
        this.parser = parser;
    }
    /**
     * Performs Esprima's tokenisation
     *
     * @param  {String} code The source code which should be processed
     * @return {Object}      Tokenised source code
     */
    parse(code) {
        return this.parser.tokenize(code);
    }
}


/**
 * Transforms the source code into EcmaScript 5 syntax
 */
class BabelParser {

    /**
     * Uses Babel to transform the source code into ECMAScript 5 syntax
     *
     * @param  {String} code Source code
     * @return {String}      Parsed source code
     */
    transform(code) {
        let transformed = Babel.transform(code, {
            presets: ['es2015']
        });
        console.log('[Babel] transform ', transformed.code);
        return transformed.code;
    }
}

/**
 * Transforms JSX syntax into valid source code
 */
class JsxParser extends BabelParser {

    /**
     * Uses Babel to transform the source code into ECMAScript 5 syntax
     * and converts JSX syntax to JavaScript
     *
     * @param  {String} code Source code
     * @return {String}      Parsed source code
     */
    transform(code) {
        let transformed = Babel.transform(code, {
            presets: ['es2015', 'react']
        });
        console.log('[JsxParser] transformed ', transformed.code);
        return transformed.code;
    }
}