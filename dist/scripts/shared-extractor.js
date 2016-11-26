'use strict';

class SharedModelExtractorChain {
    constructor() {
        this.extractors = [
            new FileImportExtractor(),
        ];
        console.log('[SharedModelExtractorChain] registered '+this.extractors.length+' extractors');
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

class FileImportExtractor extends AbstractExtractor {
    extract(input) {
        let imports = input.queryAst('[body]>[type=VariableDeclaration] [callee.name="require"]');
        return imports.map(a => a.getContents().arguments[0].value);
    }
}