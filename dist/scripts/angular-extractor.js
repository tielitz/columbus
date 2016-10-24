'use strict';

class AngularModelExtractorChain {
    constructor() {
        this.extractors = [
            new AngularComponentNameExtractor(),
            new AngularComponentBindingsExtractor(),
            new AngularComponentDependencyExtractor(),
            new AngularComponentFunctionsExtractor(),
            new AngularComponentPropertiesExtractor()
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

class AngularComponentNameExtractor extends AbstractExtractor {
    descriptor() {
        return 'components';
    }
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

        let controllerFunction = component.querySingleAst(
            '[type=Property][key.name=controller][value.type=FunctionExpression]>[body]'
        );

        if (!controllerFunction) {
            return undefined;
        }

        let expressions = controllerFunction.queryAst(
            '[id.name=controller][body]>[body]>[type=ExpressionStatement]'
        );

        return expressions.filter(a => a.getContents().expression.right.type !== 'FunctionExpression')
            .map(a => {
                return {
                    name: AstHelper.extractExpression(a.getContents().expression.left.property),
                    value: AstHelper.extractExpression(a.getContents().expression.right)
                };
            });
    }
}
