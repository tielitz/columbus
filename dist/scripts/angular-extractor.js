'use strict';

class AngularModelExtractorChain {
    constructor() {
        this.extractors = [
            new AngularComponentNameExtractor(),
            new AngularComponentBindingsExtractor(),
            new AngularComponentDependencyExtractor(),
            new AngularComponentFunctionsExtractor(),
            new AngularComponentPropertiesExtractor()
            // new ComponentListenersExtractor()
            // new AngularComponentDependencyExtractor(),
            // new ComponentRenderPropsExtractor(),
            // new ComponentRenderStyleExtractor(),
            // new ComponentFunctionReturnValueExtractor(),
            // new ComponentRenderHtmlExtractor(),
            // new ComponentRenderBehaviourExtractor()
        ];
        console.log('[AngularModelExtractorChain] registered '+this.extractors.length+' extractors');
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

class AngularComponentNameExtractor extends AbstractExtractor {
    extract(input) {
        let components = input.getComponents();
        return components.map(a => a.getName());
    }
}

class AngularComponentBindingsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let properties = component.querySingleAst(
            '[type=Property][key.name=bindings] [properties]'
        );

        if (!properties) return;

        return properties.getContents().properties.map(a => {

            return {
                name: a.key.name,
                type: undefined,
                value: undefined,
                binding: a.value.value === '<' ? 'one-way' : a.value.value === '&' ? 'out' : undefined
            };
        });
    }
}

class AngularComponentDependencyExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let dependencies = component.querySingleAst(
            '[type=Property][key.name=require] [properties]'
        );

        if (!dependencies) return;

        return dependencies.getContents().properties.map(a => {
            return {
                localName: a.key.name,
                target: a.value.value
            };
        });
    }
}


class AngularComponentFunctionsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {

        // Step 1: try to find the controller function

        // 1.a) Controller function inline
        let controllerFunction = component.querySingleAst(
            '[type=Property][key.name=controller][value.type=FunctionExpression]>[body]'
        );

        // 1.b) Controller property references function
        // TODO

        if (!controllerFunction) {
            return undefined;
        }

        let funcs = controllerFunction.queryAst(
            '[id.name=controller][body]>[body]>[type=ExpressionStatement][expression.right.type=FunctionExpression]'
        );

        return funcs.map(a => {
            let params = a.getContents().expression.right.params.map(b => b.name);
            return {
                name: a.getContents().expression.left.property.name,
                params: params.length > 0 ? params : undefined
            };
        });
    }
}

class AngularComponentPropertiesExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {

        // Step 1: try to find the controller function

        // 1.a) Controller function inline
        let controllerFunction = component.querySingleAst(
            '[type=Property][key.name=controller][value.type=FunctionExpression]>[body]'
        );

        // 1.b) Controller property references function
        // TODO

        if (!controllerFunction) {
            return undefined;
        }

        let expressions = controllerFunction.queryAst(
            '[id.name=controller][body]>[body]>[type=ExpressionStatement]'
        );

        return expressions.filter(a => a.getContents().expression.right.type !== 'FunctionExpression')
            .map(a => {
                // let params = a.getContents().expression.right.params.map(b => b.name);
                return {
                    name: AstHelper.extractExpression(a.getContents().expression.left.property),
                    value: AstHelper.extractExpression(a.getContents().expression.right)
                };
            });
    }
}


// class ComponentListenersExtractor extends AbstractComponentBasedExtractor {
//     extractFromComponent(component) {
//         let listeners = component.queryAst(
//             '[type=Property][key.type=Identifier][key.name=listeners]>[properties]>[type=Property]'
//         );

//         return listeners.map(a => this.parseListenerEntry(a.getContents()));
//     }

//     parseListenerEntry(entry) {

//         // key is either a single value (event) or target.event
//         let key = AstHelper.extractExpression(entry.key);
//         let keyParts = key.split('.');

//         return {
//             'target': keyParts.length > 1 ? keyParts[0] : undefined,
//             'event': keyParts.length > 1 ? keyParts[1] : keyParts[0],
//             'method': AstHelper.extractExpression(entry.value)
//         };
//     }
// }

// class ComponentFunctionReturnValueExtractor extends AbstractComponentBasedExtractor {
//     extractFromComponent(component) {
//         let functions = component.queryAst(
//             '[type="FunctionExpression"]'
//         );

//         let extractedFunctionReturns = {};

//         // retrieve the ReturnStatements for each function
//         for (let func of functions) {
//             let returnStatements = func.queryAst('[type="ReturnStatement"]');

//             if (extractedFunctionReturns[func.getContents().id.name] === undefined) {
//                 extractedFunctionReturns[func.getContents().id.name] = [];
//             }

//             returnStatements.forEach(a => {

//                 let foo = {
//                     type: a.getContents().argument.type,
//                 };

//                 if (foo.type === 'Literal') {
//                     foo.value = a.getContents().argument.value;
//                 } else if (foo.type === 'Identifier') {
//                     foo.name = a.getContents().argument.name;
//                 } else if (foo.type === 'MemberExpression') {
//                     foo.property = a.getContents().argument.property.name;
//                 }

//                 extractedFunctionReturns[func.getContents().id.name].push(foo);
//             });
//         }

//         console.log('[ComponentFunctionReturnValueExtractor] return statements ', extractedFunctionReturns);

//         return extractedFunctionReturns;
//     }
// }

// // Limiting  extractor to first return statement
// class ComponentRenderHtmlExtractor extends AbstractComponentBasedExtractor {
//     extractFromComponent(component) {
//         let renderReturnStatements = component.queryAst(
//             '[type="FunctionExpression"][id.name="render"] [type="ReturnStatement"]:first-child'
//         );

//         if (renderReturnStatements.length > 0) {
//             let renderReturnStatment = renderReturnStatements[0];
//             let htmlStructure = this.parseCreateElement(renderReturnStatment.getContents().argument.arguments);
//             return htmlStructure;
//         }
//         return null;
//     }

//     parseCreateElement(content) {

//         console.log('[ComponentRenderHtmlExtractor] parseCreateElement', content);

//         // element 0 contains key
//         // element 1 contains tags for the key
//         // element 2-(n-1) contain arbitrary child elements
//         let parentContent = null;
//         let childContent = [];

//         // append first entry
//         switch (content[0].type) {
//             case 'Literal':
//                 parentContent = {type: 'HtmlExpression', value: content[0].value};
//                 break;
//             case 'Identifier':
//                 parentContent = {type: 'Identifier', value: content[0].name};
//                 break;
//             default:
//                 throw Exception('Unexpected content[0] type ' + content[0].type);
//         }

//         // If an object {} is present at the second place, check if it contains an id property
//         if (content[1].type === 'ObjectExpression') {
//             let optionalId = content[1].properties.find(a => a.key.name === 'id');
//             if (optionalId !== undefined) {
//                 parentContent.id = optionalId.value.value;
//             }
//         }

//         for (let i = 2; i < content.length; i++) {
//             let child = content[i];

//             if (child.type === 'Literal') {
//                 childContent.push({type: 'Literal', value: child.value});
//             } else if (child.type === 'MemberExpression') {
//                 childContent.push({type: 'MemberExpression', value: AstHelper.extractExpression(child)});
//             } else if (child.type === 'CallExpression') {
//                 // either it's React.createElement or an arbitrary function
//                 if (AstHelper.isReactCreateElement(child)) {
//                     // start recursive tree
//                     childContent = childContent.concat(this.parseCreateElement(child.arguments));
//                 }  else {
//                     childContent.push({type: 'CallExpression', value: AstHelper.extractExpression(child)});
//                 }
//             } else {
//                 childContent.push('Unknown type: ' + child.type);
//             }
//         }

//         if (childContent.length > 0) {
//             parentContent.children = childContent;
//         }

//         return parentContent;
//     }
// }

// class ComponentRenderBehaviourExtractor extends AbstractComponentBasedExtractor {
//     extractFromComponent(component) {
//         let callExpressions = component.queryAst(
//             '[type="FunctionExpression"][id.name="render"] [type="ReturnStatement"] [type="CallExpression"]'
//         );

//         return callExpressions
//             .filter(a => AstHelper.isReactCreateElement(a.getContents()))
//             // The on... elements are always stored in the object literal on the second position
//             .filter(a => a.getContents().arguments.length >= 2 && a.getContents().arguments[1].type === 'ObjectExpression')
//             .map(a => {
//                 return {
//                     element: this.extractEventSource(a.getContents().arguments[0]),
//                     properties: a.getContents().arguments[1].properties
//                         .filter(b => this.isBehaviouralProperty(b))
//                         .map(b => this.convertPropertyEntry(b))
//                 };
//             })
//             .filter(parsedEntry => parsedEntry.properties.length > 0); // remove all entries with empty array
//     }

//     extractEventSource(entry) {
//         if (entry.type === 'Identifier') {
//             return entry.name; // component
//         }
//         return entry.value; // for strings
//     }

//     isBehaviouralProperty(entry) {
//         return entry.key.name.startsWith('on');
//     }

//     convertPropertyEntry(entry) {
//         let key = entry.key.name;
//         let action = AstHelper.extractExpression(entry.value);
//         let parameters = AstHelper.extractFunctionParameters(entry.value);
//         return {event: key, action: action, params: parameters};
//     }
// }