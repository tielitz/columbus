'use strict';

class ReactModelExtractorChain {
    constructor() {
        this.extractors = [
            new ReactComponentNameExtractor(),
            new ReactComponentProptypesExtractor(),
            new ReactComponentDefaultPropsExtractor(),
            new ReactComponentInitialStateExtractor(),
            new ReactComponentFunctionsExtractor(),
            new ReactComponentDependencyExtractor(),
            new ReactComponentRenderPropsExtractor(),
            new ReactComponentRenderStyleExtractor(),
            new ReactComponentFunctionReturnValueExtractor(),
            new ReactComponentRenderHtmlExtractor(),
            new ReactComponentRenderBehaviourExtractor(),
            new ReactComponentLifeCycleExtractor()
        ];
        console.log('[ReactModelExtractorChain] registered '+this.extractors.length+' extractors');
    }

    /**
     * @param  {Ast}      input
     * @return {[object]}
     */
    apply(input) {
        let output = {};

        for (let extractor of this.extractors) {
            try {
                let extractorDesc = extractor.descriptor();
                let extractorOut = extractor.extract(input);

                output[extractorDesc] = extractorOut;
            } catch (e) {
                console.warn('[ModelExtractorChain] something went wrong with one of the extractors', e);
            }
        }

        return output;
    }
}

// ########################################################################
// ########################################################################

class ReactComponentNameExtractor extends AbstractExtractor {
    descriptor() {
        return 'components';
    }
    extract(input) {
        let components = input.getComponents();
        return components.map(a => this.extractName(a.getContents()));
    }

    extractName(a) {
        if (a.left && a.left.type === 'MemberExpression') {
            return a.left.property.name;
        }
        return a.id.name
    }
}

class ReactComponentProptypesExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let propTypes = component.queryAst(
            '[key.name="propTypes"] > [properties] > [type]'
        );

        if (!propTypes) return;

        return propTypes
            .map(a => {
                return {
                    name: a.getContents().key.name,
                    type: AstHelper.extractExpression(a.getContents().value)
                };
            });
    }
}

class ReactComponentDefaultPropsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let defValues = component.queryAst(
            '[type="FunctionExpression"][id.name="getDefaultProps"] [type="ReturnStatement"] [properties] [type="Property"]'
        );

        if (!defValues) return;

        return defValues.map(a => {
            return {
                name: a.getContents().key.name,
                value: a.getContents().value.value // todo: extract expression should allow for methods
            };
        });
    }
}

class ReactComponentInitialStateExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let defValues = component.queryAst(
            '[type="FunctionExpression"][id.name="getInitialState"] [type="ReturnStatement"] [properties] [type="Property"]'
        );

        if (!defValues) return;

        return defValues.map(a => {
            return {
                name: a.getContents().key.name,
                value: a.getContents().value.value // todo: extract expression should allow for methods
            };
        });
    }
}

class ReactComponentFunctionsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let funcs = component.queryAst(
            '[arguments] > [properties] > [value.type="FunctionExpression"]'
        );

        if (!funcs) return;

        return funcs.map(a => {
            return {
                name: a.getContents().value.id.name,
                params: a.getContents().value.params.map(e => e.name)
            }
        });
    }
}

class ReactComponentDependencyExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let reactCreateElementTags = component.queryAst(
            '[value.id.name="render"] [type="ReturnStatement"] [arguments] [type="Identifier"]:first-child'
        );

        if (!reactCreateElementTags) return;

        return reactCreateElementTags.map(a => a.getContents().name);
    }
}

class ReactComponentRenderPropsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let props = component.queryAst(
            '[key.name="render"] [type="MemberExpression"][object.property.name="props"]'
        );

        if (!props) return;

        return props.map(a => {
            return {name: a.getContents().property.name};
        });
    }
}

class ReactComponentRenderStyleExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let styles = component.queryAst(
            '[type="FunctionExpression"][id.name="render"] [type="ObjectExpression"] [type="Property"][key.name="style"]'
        );

        if (!styles) return;

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

class ReactComponentFunctionReturnValueExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let functions = component.queryAst(
            '[type="FunctionExpression"]'
        );

        let extractedFunctionReturns = {};

        if (!functions) return;

        // retrieve the ReturnStatements for each function
        for (let func of functions) {
            let returnStatements = func.queryAst('[type="ReturnStatement"]');

            if (extractedFunctionReturns[func.getContents().id.name] === undefined) {
                extractedFunctionReturns[func.getContents().id.name] = [];
            }

            if (!returnStatements) continue;

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

        console.log('[ReactComponentFunctionReturnValueExtractor] return statements ', extractedFunctionReturns);

        return extractedFunctionReturns;
    }
}

// Limiting  extractor to first return statement
class ReactComponentRenderHtmlExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let renderReturnStatements = component.queryAst(
            '[type="FunctionExpression"][id.name="render"] [type="ReturnStatement"]'
        );

        if (renderReturnStatements && renderReturnStatements.length > 0) {
            let renderReturnStatment = renderReturnStatements[0];
            let htmlStructure = this.parseCreateElement(renderReturnStatment.getContents().argument.arguments);
            return htmlStructure;
        }
        return null;
    }

    parseCreateElement(content) {

        console.log('[ReactComponentRenderHtmlExtractor] parseCreateElement', content);

        // element 0 contains key
        // element 1 contains tags for the key
        // element 2-(n-1) contain arbitrary child elements
        let parentContent = null;
        let childContent = [];

        // append first entry
        switch (content[0].type) {
            case 'Literal':
                parentContent = {type: 'HtmlExpression', value: content[0].value};
                break;
            case 'Identifier':
                parentContent = {type: 'Identifier', value: content[0].name};
                break;
            case 'MemberExpression':
                parentContent = {type: 'Identifier', value: content[0].object.name};
                break;
            default:
                throw new Error('Unexpected content[0] type ' + content[0].type);
        }

        // If an object {} is present at the second place, check if it contains an id property
        if (content[1].type === 'ObjectExpression') {
            let optionalId = content[1].properties.find(a => a.key.name === 'id');
            if (optionalId !== undefined) {
                parentContent.id = optionalId.value.value;
            }
        }

        for (let i = 2; i < content.length; i++) {
            let child = content[i];

            if (child.type === 'Literal') {
                childContent.push({type: 'Literal', value: child.value});
            } else if (child.type === 'MemberExpression') {
                childContent.push({type: 'MemberExpression', value: AstHelper.extractExpression(child)});
            } else if (child.type === 'CallExpression') {
                // either it's React.createElement or an arbitrary function
                if (AstHelper.isReactCreateElement(child)) {
                    // start recursive tree
                    childContent = childContent.concat(this.parseCreateElement(child.arguments));
                }  else {
                    childContent.push({type: 'CallExpression', value: AstHelper.extractExpression(child), params: AstHelper.extractFunctionParameters(child)});
                }
            } else {
                childContent.push('Unknown type: ' + child.type);
            }
        }

        if (childContent.length > 0) {
            parentContent.children = childContent;
        }

        return parentContent;
    }
}

class ReactComponentRenderBehaviourExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let callExpressions = component.queryAst(
            '[type="FunctionExpression"][id.name="render"] [type="ReturnStatement"] [type="CallExpression"]'
        );

        if (!callExpressions) return;

        return callExpressions
            .filter(a => AstHelper.isReactCreateElement(a.getContents()))
            // The on... elements are always stored in the object literal on the second position
            .filter(a => a.getContents().arguments.length >= 2 && a.getContents().arguments[1].type === 'ObjectExpression')
            .map(a => {
                return {
                    element: this.extractEventSource(a.getContents().arguments[0]),
                    properties: a.getContents().arguments[1].properties
                        .filter(b => this.isBehaviouralProperty(b))
                        .map(b => this.convertPropertyEntry(b))
                };
            })
            .filter(parsedEntry => parsedEntry.properties.length > 0); // remove all entries with empty array
    }

    extractEventSource(entry) {
        if (entry.type === 'Identifier') {
            return entry.name; // component
        }
        return entry.value; // for strings
    }

    isBehaviouralProperty(entry) {
        return entry.key.name.startsWith('on');
    }

    convertPropertyEntry(entry) {
        console.log('[ReactComponentRenderBehaviourExtractor]', entry);
        let key = entry.key.name;
        let action = AstHelper.extractExpression(entry.value);
        let parameters = AstHelper.extractFunctionParameters(entry.value);
        return {event: key, action: action, params: parameters};
    }
}

class ReactComponentLifeCycleExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let funcs = component.queryAst(
            '[arguments] > [properties] > [value.type="FunctionExpression"]'
        );

        if (!funcs) return;

        const events = ['componentWillMount','componentDidMount','componentWillReceiveProps','shouldComponentUpdate',
            'componentWillUpdate','componentDidUpdate','componentWillUnmount'];

        return funcs.filter(a => events.indexOf(a.getContents().value.id.name) >= 0)
                    .map(a => {
                        console.log('[ReactComponentLifeCycleExtractor] found entry', a);
                        return {
                            name: a.getContents().value.id.name,
                            params: a.getContents().value.params.map(e => e.name)
                        }
                    });
    }
}