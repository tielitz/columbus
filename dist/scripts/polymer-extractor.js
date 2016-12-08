'use strict';

class PolymerModelExtractorChain extends SharedModelExtractorChain {
    constructor() {
        super();

        this.extractors = [
            new PolymerComponentNameExtractor(),
            new PolymerComponentPropertiesExtractor(),
            new PolymerComponentFunctionsExtractor(),
            new PolymerComponentListenersExtractor(),
            new PolymerAddEventListenerExtractor()
        ];
    }
}

// ########################################################################
// ########################################################################

/**
 * Extracts the name of the components
 * Remnant before the method was implemented in the Ast
 */
class PolymerComponentNameExtractor extends AbstractExtractor {
    descriptor() {
        return 'components';
    }
    extract(input) {
        let components = input.getComponents();
        return components.map(a => a.getName());
    }
}

/**
 * Extracts all properties definitions in the properties section
 */
class PolymerComponentPropertiesExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let properties = component.queryAst(
            '[type=Property][key.type=Identifier][key.name=properties]>[properties]>[type=Property]'
        );

        if (!properties) return;

        return properties.map(a => {

            let typeAst = a.querySingleAst('[type=Property][key.type=Identifier][key.name=type]');
            let valueAst = a.querySingleAst('[type=Property][key.type=Identifier][key.name=value]');

            return {
                name: a.getContents().key.name,
                type: typeAst ? AstHelper.extractExpression(typeAst.getContents().value) : undefined,
                value: valueAst ? AstHelper.extractExpression(valueAst.getContents().value) : undefined,
            }
        });
    }
}

/**
 * Extracts all function declarations
 */
class PolymerComponentFunctionsExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let funcs = component.queryAst(
            '[arguments]>[properties]>[type=Property][value.type=FunctionExpression]'
        );

        if (!funcs) return;

        return funcs.map(a => {
            return {
                name: a.getContents().key.name,
                params: a.getContents().value.params.map(e => e.name)
            }
        });
    }
}

/**
 * Extracts all listeners declarations inside the listeners section
 */
class PolymerComponentListenersExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let listeners = component.queryAst(
            '[type=Property][key.type=Identifier][key.name=listeners]>[properties]>[type=Property]'
        );

        if (!listeners) return;

        return listeners.map(a => this.parseListenerEntry(a.getContents()));
    }

    parseListenerEntry(entry) {

        // key is either a single value (event) or target.event
        let key = AstHelper.extractExpression(entry.key);
        let keyParts = key.split('.');

        return {
            'target': keyParts.length > 1 ? keyParts[0] : undefined,
            'event': keyParts.length > 1 ? keyParts[1] : keyParts[0],
            'method': AstHelper.extractExpression(entry.value)
        };
    }
}

/**
 * Extracts all events and their methods that are declared using addEventListener
 */
class PolymerAddEventListenerExtractor extends AbstractComponentBasedExtractor {
    extractFromComponent(component) {
        let listeners = component.queryAst('[type=CallExpression][callee.property.name=addEventListener]');

        if (!listeners) return;

        return listeners.map(a => {
            return {
                event: AstHelper.extractExpression(a.getContents().arguments[0]),
                method: AstHelper.extractExpression(a.getContents().arguments[1])
            };
        });
    }
}
