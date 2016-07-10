'use strict';

class Ast {
    constructor(value) {
        this.value = value;
    }

    getContents() {
        return this.value;
    }

    asJson() {
        return JSON.stringify(this.value, null, '\t');
    }

    queryAst(query) {
        let selectorAst = esquery.parse(query);
        return new Ast(esquery.match(this.value, selectorAst));
    }
}

class AstParser {
    constructor(parser) {
        this.parser = parser;
    }
    parse(code) {
        let ast = this.parser.parse(code);
        return new Ast(ast);
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
        let output = {};

        // for (var i = 0; i < this.extractors.length; i++) {
        // var extractorDesc = this.extractors[i].descriptor();
        // var extractorOut = this.extractors[i].extract(input);

        for (let extractor of this.extractors) {
            let extractorDesc = extractor.descriptor();
            let extractorOut = extractor.extract(input);

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

    printDebug(val) {
        console.log(JSON.stringify(val, null, '\t'));
    }
}

class ComponentNameExtractor extends AbstractExtractor {
    extract(input) {
        let components = input.queryAst(
            '[body] > [type="VariableDeclaration"] > [type="VariableDeclarator"]'
        );

        return components.getContents()
            .filter(function (e) {
                return e.init.type === 'CallExpression'
                    && e.init.callee.object.name === 'React'
                    && e.init.callee.property.name === 'createClass'
            })
            .map(a => a.id.name);
    }
}