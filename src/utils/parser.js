'use strict';

import {Ast,AstHelper, ReactAst, AngularAst, PolymerAst} from './ast';
import * as babel from 'babel-standalone';

/**
 * Compiles the source code into a framework specific AST
 */
export class AstParser {

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
export class TokenParser {

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
export class BabelParser {

    /**
     * Uses Babel to transform the source code into ECMAScript 5 syntax
     *
     * @param  {String} code Source code
     * @return {String}      Parsed source code
     */
    transform(code) {
        let transformed = babel.transform(code, {
            presets: ['es2015']
        });
        return transformed.code;
    }
}

/**
 * Transforms JSX syntax into valid source code
 */
export class JsxParser extends BabelParser {

    /**
     * Uses Babel to transform the source code into ECMAScript 5 syntax
     * and converts JSX syntax to JavaScript
     *
     * @param  {String} code Source code
     * @return {String}      Parsed source code
     */
    transform(code) {
        let transformed = babel.transform(code, {
            presets: ['es2015', 'react']
        });
        return transformed.code;
    }
}