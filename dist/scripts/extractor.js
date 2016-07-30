'use strict';

class ModelExtractorChain {
    constructor() {
        this.extractors = [
            new ComponentNameExtractor(),
            new ComponentProptypesExtractor(),
            new ComponentDefaultPropsExtractor(),
            new ComponentFunctionsExtractor(),
            new ComponentDependencyExtractor(),
            new ComponentRenderPropsExtractor(),
            new ComponentRenderStyleExtractor(),
            new ComponentFunctionReturnValueExtractor(),
            new ComponentRenderHtmlExtractor()
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

class ComponentDefaultPropsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let defValues = component.queryAst(
            '[type="FunctionExpression"][id.name="getDefaultProps"] [type="ReturnStatement"] [properties] [type="Property"]'
        );

        return defValues.map(a => {
            return {
                name: a.getContents().key.name,
                value: a.getContents().value.value
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

        return props.map(a => {
            return {name: a.getContents().property.name};
        });
    }
}

class ComponentRenderStyleExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let styles = component.queryAst(
            '[type="FunctionExpression"][id.name="render"] [type="ObjectExpression"] [type="Property"][key.name="style"]'
        );

        return styles.map(a => {
            return a.getContents().value.value
                .split(';')
                .map(e => e.trim())
                .filter(el => el !== '') // Remove empty string if ; was the last character
                .map(el => {
                    return {
                        name: el.split(':')[0].trim(),
                        value: el.split(':')[1].trim(),
                    };
                });
        });
    }
}

class ComponentFunctionReturnValueExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let functions = component.queryAst(
            '[type="FunctionExpression"]'
        );

        let extractedFunctionReturns = {};

        // retrieve the ReturnStatements for each function
        for (let func of functions) {
            let returnStatements = func.queryAst('[type="ReturnStatement"]');

            if (extractedFunctionReturns[func.getContents().id.name] === undefined) {
                extractedFunctionReturns[func.getContents().id.name] = [];
            }

            returnStatements.forEach(a => {

                let foo = {
                    type: a.getContents().argument.type,
                };

                if (foo.type === 'Literal') {
                    foo.value = a.getContents().argument.value;
                } else if (foo.type === 'Identifier') {
                    foo.name = a.getContents().argument.name;
                } else if (foo.type === 'MemberExpression') {
                    foo.property = a.getContents().argument.property.name;
                }

                extractedFunctionReturns[func.getContents().id.name].push(foo);
            });
        }

        console.log('[ComponentFunctionReturnValueExtractor] return statements ', extractedFunctionReturns);

        return extractedFunctionReturns;
    }
}

// Limiting  extractor to first return statement
class ComponentRenderHtmlExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let renderReturnStatements = component.queryAst(
            '[type="FunctionExpression"][id.name="render"] [type="ReturnStatement"]:first-child'
        );

        if (renderReturnStatements.length > 0) {
            let renderReturnStatment = renderReturnStatements[0];
            let htmlStructure = this.parseLevel(renderReturnStatment.getContents().argument.arguments);
            return htmlStructure;
        }
        return null;
    }

    parseLevel(levelContent) {
        console.log('[ComponentRenderHtmlExtractor] parse level', levelContent);

        let returnedContent = [];

        for (let entry of levelContent) {

            if (entry.type === 'Literal' && entry.value !== null) {
                returnedContent.push(entry.value);
            } else if (entry.type === 'CallExpression') {
                // check if it's a call to React.createElement or just normal method
                if (this.isReactCreateElement(entry)) {
                    // increase level
                    returnedContent.push(this.parseLevel(entry.arguments));
                } else {
                    // regular method call, ignore for now
                }
            }
        }

        return returnedContent;
    }

    isReactCreateElement(entry) {
        return entry.type === 'CallExpression' && entry.callee.object.name === 'React' && entry.callee.property.name === 'createElement';
    }
}
