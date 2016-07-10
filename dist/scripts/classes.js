'use strict';

class Ast {
    constructor(ast, tokens) {
        this.ast = ast;
        this.tokens = tokens;
    }

    asJson() {
        return JSON.stringify(this.ast, null, '\t');
    }

    tokensAsJson() {
        return JSON.stringify(this.tokens, null, '\t');
    }

    queryAst(query) {
        var selectorAst = esquery.parse(query);
        return esquery.match(this.ast, selectorAst);
    }
}

class AstParser {
    constructor(parser) {
        this.parser = parser;
    }
    parse(code) {
        var ast = this.parser.parse(code);
        var tokens = this.parser.tokenize(code);

        return new Ast(ast, tokens);
    }
}

class JsxParser {
    transform(code) {
        var transformed = Babel.transform(code, {
            presets: ['es2015', 'react']
        });
        return transformed.code;
    }
}

class ModelExtractorChain {
    constructor() {
        this.extractors = [
            new ComponentNameExtractor()
        ];
        console.log('[ModelExtractorChain] registered '+this.extractors.length+' extractors');
    }

    /**
     * @param  {Ast}      input
     * @return {[object]}
     */
    apply(input) {
        var output = {};

        for (var i = 0; i < this.extractors.length; i++) {
            var extractorDesc = this.extractors[i].descriptor();
            var extractorOut = this.extractors[i].extract(input);

            output[extractorDesc] = extractorOut;
        }

        return output;
    }
}

class AbstractExtractor {

    /**
     * Descriptor that is used in the model json as an identifier
     * @return {string}
     */
    descriptor() {
        return this.constructor.name;
    }

    /**
     * @param  {Ast}    input
     * @return {object}
     */
    extract(input) {
        return undefined;
    }
}

class ComponentNameExtractor extends AbstractExtractor {
    extract(input) {
        var components = input.queryAst(
            '[type="Program"] [type="VariableDeclaration"]'
        );

        // TODO: check that it has React.createClass as value assigned

        return components.map(function (a) {
            return a.declarations[0].id.name;
        });
    }
}