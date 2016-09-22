'use strict';

class ModelExtractorChain {
    constructor() {
        this.extractors = [
            new ComponentNameExtractor(),
            new ComponentBindingsExtractor(),
            new ComponentDependencyExtractor(),
            // new ComponentFunctionsExtractor(),
            // new ComponentListenersExtractor()
            // new ComponentDependencyExtractor(),
            // new ComponentRenderPropsExtractor(),
            // new ComponentRenderStyleExtractor(),
            // new ComponentFunctionReturnValueExtractor(),
            // new ComponentRenderHtmlExtractor(),
            // new ComponentRenderBehaviourExtractor()
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
            output[component.getName()] = this.extractFromComponent(component);
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
        return components.map(a => a.getName());
    }
}

class ComponentBindingsExtractor extends AbstractComponentBasedExtractor {
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

class ComponentDependencyExtractor extends AbstractComponentBasedExtractor {
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




// class ComponentFunctionsExtractor extends AbstractComponentBasedExtractor {
//     extractFromComponent(component) {
//         let funcs = component.queryAst(
//             '[arguments]>[properties]>[type=Property][value.type=FunctionExpression]'
//         );

//         return funcs.map(a => {
//             return {
//                 name: a.getContents().key.name,
//                 params: a.getContents().value.params.map(e => e.name)
//             }
//         });
//     }
// }

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