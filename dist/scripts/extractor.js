'use strict';

class ModelExtractorChain {
    constructor() {
        this.extractors = [
            new ComponentNameExtractor(),
            new ComponentProptypesExtractor(),
            new ComponentFunctionsExtractor(),
            new ComponentDependencyExtractor(),
            new ComponentRenderPropsExtractor()
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

// ########################################################################
// ########################################################################

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
        if (val instanceof Array) {
            val.forEach(a => console.log(JSON.stringify(a, null, '\t')));
        } else {
            console.log(JSON.stringify(val, null, '\t'));
        }
    }
}

class AbstractComponentBasedExtractor extends AbstractExtractor {
    extract(input) {
        let components = input.getComponents();
        let output = {};

        for (let component of components) {
            output[component.getContents().id.name] = this.extractFromComponent(component);
        }

        return output;
    }

    extractFromComponent(component) {
        return undefined;
    }
}

// ########################################################################
// ########################################################################

class ComponentNameExtractor extends AbstractExtractor {
    extract(input) {
        let components = input.getComponents();
        return components.map(a => a.getContents().id.name);
    }
}

class ComponentProptypesExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let propTypes = component.queryAst(
            '[key.name="propTypes"]~[value] > [properties] > [type]'
        );

        return propTypes
            .map(a => {
                return {
                    name: a.getContents().key.name,
                    type: a.getContents().value.property.name
                };
            });
    }
}

class ComponentFunctionsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let funcs = component.queryAst(
            '[arguments] > [properties] > [value.type="FunctionExpression"]'
        );

        return funcs.map(a => {
            return {
                name: a.getContents().value.id.name,
                params: a.getContents().value.params.map(e => e.name)
            }
        });
    }
}

class ComponentDependencyExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let reactCreateElementTags = component.queryAst(
            '[value.id.name="render"] [type="ReturnStatement"] > [arguments] > [callee.property.name="createElement"]'
        );

        this.printDebug(reactCreateElementTags);

        /*
         * Filter elements that call React.createElement with exactly two parameters
         * Either it's an object literal {...} or null
         */
        return reactCreateElementTags.filter(a => {
            console.log(a.getContents().arguments.length === 2);
            return a.getContents().arguments.length === 2
                && a.getContents().arguments[0].type === 'Identifier'
                && (
                    a.getContents().arguments[1].type === 'ObjectExpression'
                    || a.getContents().arguments[1].type === 'Literal'
                );
            })
            .map(a => a.getContents().arguments[0].name);
    }
}

class ComponentRenderPropsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let props = component.queryAst(
            '[key.name="render"] [type="MemberExpression"][object.property.name="props"]'
        );

        return props.map(a => a.getContents().property.name);
    }
}
