'use strict';

import {SharedModelExtractorChain,AbstractExtractor,AbstractComponentBasedExtractor} from './shared-extractor';
import {AstHelper} from './ast';

export class AngularModelExtractorChain extends SharedModelExtractorChain {
    constructor() {
        super();

        this.extractors = [
            new AngularComponentNameExtractor(),
            new AngularComponentBindingsExtractor(),
            new AngularComponentDependencyExtractor(),
            new AngularComponentFunctionsExtractor(),
            new AngularComponentPropertiesExtractor()
        ];
    }
}

// ########################################################################
// ########################################################################

/**
 * Extracts the name of the components
 * Remnant before the method was implemented in the Ast
 */
export class AngularComponentNameExtractor extends AbstractExtractor {
    descriptor() {
        return 'components';
    }
    extract(input) {
        let components = input.getComponents();
        return components.map(a => a.getName());
    }
}

/**
 * Extracts all component bindings
 */
export class AngularComponentBindingsExtractor extends AbstractComponentBasedExtractor {
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

/**
 * Extracts dependencies to other components from the require section
 */
export class AngularComponentDependencyExtractor extends AbstractComponentBasedExtractor {
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

/**
 * Extracts all defined functions in the controller
 */
export class AngularComponentFunctionsExtractor extends AbstractComponentBasedExtractor {
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

/**
 * Extracts all properties of the component that are defined in the controller function with this. and any other object
 * for that matter. Fix me please
 */
export class AngularComponentPropertiesExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {

        // Step 1: try to find the controller function

        let controllerFunction = component.querySingleAst(
            '[type=Property][key.name=controller][value.type=FunctionExpression]>[body]'
        );

        if (!controllerFunction) {
            return undefined;
        }

        let expressions = controllerFunction.queryAst(
            '[id.name=controller][body]>[body]>[type=ExpressionStatement]'
        ).filter(a => a.getContents().expression.type === 'AssignmentExpression'
                && a.getContents().expression.right.type !== 'FunctionExpression');

        let expressions2 = controllerFunction.queryAst(
            '[id.name=controller][body]>[body]>[type=VariableDeclaration]'
        ).filter(a => a.getContents().declarations[0].init.type === 'AssignmentExpression');

        return expressions.map(a => {
                return {
                    name: AstHelper.extractExpression(a.getContents().expression.left.property),
                    value: AstHelper.extractExpression(a.getContents().expression.right)
                };
            }).concat(expressions2.map(a => {
                return {
                    name: a.getContents().declarations[0].id.name
                }
            }));
    }
}
