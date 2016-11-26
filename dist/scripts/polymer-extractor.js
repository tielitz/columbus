'use strict';

class PolymerModelExtractorChain {
    constructor() {
        this.extractors = [
            new PolymerComponentNameExtractor(),
            new PolymerComponentPropertiesExtractor(),
            new PolymerComponentFunctionsExtractor(),
            new PolymerComponentListenersExtractor(),
            new PolymerAddEventListenerExtractor()
        ];
        console.log('[PolymerModelExtractorChain] registered '+this.extractors.length+' extractors');
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
                console.warn('[ModelExtractorChain] something went wrong with '+extractor.descriptor(), e);
            }
        }

        return output;
    }
}

// ########################################################################
// ########################################################################

class PolymerComponentNameExtractor extends AbstractExtractor {
    descriptor() {
        return 'components';
    }
    extract(input) {
        let components = input.getComponents();
        return components.map(a => a.getName());
    }
}

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
