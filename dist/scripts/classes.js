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

    /**
     * @param  {string} query
     * @return {Ast[]}
     */
    queryAst(query) {
        console.log('[QueryAST] ', query);
        let selectorAst = esquery.parse(query);
        let matches = esquery.match(this.value, selectorAst);
        return matches.map(a => new Ast(a));
    }
}

class ReactAst extends Ast {
    getComponents() {
        let components = this.queryAst(
            '[body] > [type="VariableDeclaration"] > [init.type="CallExpression"]'
        );
        return components.filter(a => {
            return a.getContents().init.callee.object.name === 'React'
                    && a.getContents().init.callee.property.name === 'createClass'
        });
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
    parseReact(code) {
        let ast = this.parser.parse(code);
        return new ReactAst(ast);
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
            new ComponentNameExtractor(),
            new ComponentProptypesExtractor()
        ];
        console.log('[ModelExtractorChain] registered '+this.extractors.length+' extractors');
    }

    /**
     * @param  {Ast}      input
     * @return {[object]}
     */
    apply(input) {
        let output = {};

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
        let components = input.getComponents();
        return components.map(a => a.getContents().id.name);
    }
}

class ComponentProptypesExtractor extends AbstractExtractor {
    extract(input) {

        let components = input.getComponents();
        let output = {};

        for (let component of components) {
            let propTypes = component.queryAst(
                '[key.name="propTypes"]~[value] > [properties] > [type]'
            );

            output[component.getContents().id.name] = propTypes
                .map(a => {
                    return {
                        name: a.getContents().key.name,
                        type: a.getContents().value.property.name
                    };
                });
        }

        // TODO: read default value from getDefaultProps

        return output;
    }
}