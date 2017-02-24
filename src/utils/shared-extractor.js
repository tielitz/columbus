'use strict';

/**
 * Abstract class for the extractor chains.
 */
export default class SharedModelExtractorChain {
    constructor() {
        this.extractors = [];
        this.processErrors = [];
    }

    /**
     * Applies each extraction rule on the abstract syntax tree
     * @param  {Ast}      input The relevant abstract syntax tree
     * @return {Object}         The information base filled with entries extracted from the source code
     */
    apply(input) {
        console.log('['+this.constructor.name+'] registered '+this.extractors.length+' extractors');

        let output = {};

        for (let extractor of this.extractors) {
            try {
                // Use a descriptor as the unique id under which the information is stored
                // Currently thats always the class name of the extraction rule
                let extractorDesc = extractor.descriptor();
                let extractorOut = extractor.extract(input);

                output[extractorDesc] = extractorOut;
            } catch (e) {
                // Generates an error log which is displayed in the interface
                this.processErrors.push({
                    extractor: extractor.descriptor(),
                    expection: e
                });
                console.warn('['+this.constructor.name+'] something went wrong with '+extractor.descriptor(), e);
            }
        }

        return output;
    }

    /**
     * Retrieves a list of all extraction errors that occured when going through the relevant ast
     * @return {Array} List of extraction errors
     */
    getProcessErrors() {
        return this.processErrors;
    }
}

// ########################################################################
// ########################################################################

/**
 * Base class of all extraction rules
 */
export class AbstractExtractor {

    /**
     * Descriptor which is used in the information base as the unique identifier
     * @return {string}
     */
    descriptor() {
        return this.constructor.name;
    }

    /**
     * Actual extract method which receives the AST as input and has to extract information
     *
     * @param  {Ast}    input The relevant AST
     * @return {Object}       The extracted information
     */
    extract(input) {
        return undefined;
    }

    /**
     * Debug method that prints out the passed parameter
     *
     * @param  {string} val The value to print
     */
    printDebug(val) {
        if (val instanceof Array) {
            val.forEach(a => console.log(JSON.stringify(a, null, '\t')));
        } else {
            console.log(JSON.stringify(val, null, '\t'));
        }
    }
}

/**
 * Base extractor which preselects all components and handels each one by one
 */
export class AbstractComponentBasedExtractor extends AbstractExtractor {

    /**
     * Actual extract method which receives the AST as input and has to extract information
     *
     * @param  {Ast}    input The relevant AST
     * @return {Object}       The extracted information
     */
    extract(input) {
        let components = input.getComponents();
        let output = {};

        for (let component of components) {
            output[component.getName()] = this.extractFromComponent(component);
        }

        return output;
    }

    /**
     * @param  {Ast}    component The relevant AST of the component
     * @return {Object}           The extracted information
     */
    extractFromComponent(component) {
        return undefined;
    }
}

/**
 * General extraction rule which extracts all required / imported dependencies at the top of the file
 */
export class FileImportExtractor extends AbstractExtractor {
    extract(input) {
        let imports = input.queryAst('[body]>[type=VariableDeclaration] [callee.name="require"]');
        return imports.map(a => a.getContents().arguments[0].value);
    }
}