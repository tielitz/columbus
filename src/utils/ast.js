'use strict';

import esquery from 'esquery';

/**
 * Base class to hold the abstract syntax tree
 */
export default class Ast {

    constructor(value) {
        this.value = value;
    }

    getContents() {
        return this.value;
    }

    /**
     * Format the AST into JSON format
     * @return {String} JSON format of AST
     */
    asJson() {
        return JSON.stringify(this.value, null, '\t');
    }

    /**
     * Apply the given ESQuery to the AST and return all matches
     *
     * @param  {string} query
     * @return {Ast[]}
     */
    queryAst(query) {
        console.log('[QueryAST] ', query);
        let selectorAst = esquery.parse(query);
        let matches = esquery.match(this.value, selectorAst);
        return matches.map(a => new Ast(a));
    }

    /**
     * Apply the geiven ESQuery and return a single result. The first result is used if more than one result is found
     *
     * @param  {String} query
     * @return {Ast}
     */
    querySingleAst(query) {
        console.log('[QuerySingleAst] ', query);
        let selectorAst = esquery.parse(query);
        let matches = esquery.match(this.value, selectorAst);
        if (matches.length > 0) {
            return new Ast(matches[0]);
        }
        return null;
    }
}

/**
 * AST implementation with react specific functions
 */
export class ReactAst extends Ast {

    /**
     * Returns a list of all components found in the AST
     *
     * @return {ReactAst[]} Subtree of every React component in the AST
     */
    getComponents() {
        // Option 1 to define components
        let components = this.queryAst(
            '[body] > [type="VariableDeclaration"] > [init.type="CallExpression"][init.callee.property.name="createClass"]'
        );

        // Option 2 to define components
        let components2 = this.queryAst(
            '[body] [right.type="CallExpression"][right.callee.property.name="createClass"]'
        );

        // merge and retrieve
        let allComponents = components.concat(components2);

        return allComponents.map(a => new ReactAst(a.getContents()));
    }

    /**
     * Returns the name of the current component
     * This method only works if it is invoked on a subtree returned by getComponents()
     *
     * @return {String} Name of the current component
     */
    getName() {
        if (this.getContents().left && this.getContents().left.type === 'MemberExpression') {
            return this.getContents().left.property.name;
        }
        return this.getContents().id.name;
    }
}

/**
 * AST implementation with Polymer specific functions
 */
export class PolymerAst extends Ast {

    /**
     * Returns a list of all components found in the AST
     *
     * @return {ReactAst[]} Subtree of every React component in the AST
     */
    getComponents() {
        // Option 1 to define components
        let components = this.queryAst(
            '[body] [type=CallExpression][callee.type="SequenceExpression"]'
        ).filter(a => a.getContents().callee.expressions[1].property.name="default");

        // Option 2 to define components
        let components2 = this.queryAst(
            '[body] [type=CallExpression][callee.name=Polymer]'
        );

        // merge and retrieve
        let allComponents = components.concat(components2);

        return allComponents
            .map(a => new PolymerAst(a.getContents()));
    }

    /**
     * Returns the name of the current component
     * This method only works if it is invoked on a subtree returned by getComponents()
     *
     * @return {String} Name of the current component
     */
    getName() {
        let name = this.queryAst(
            '[type=Property][key.type=Identifier][key.name=is]'
        );
        return name[0].getContents().value.value;
    }
}

/**
 * AST implementation with AngularJS specific functions
 */
export class AngularAst extends Ast {

    /**
     * Returns a list of all components found in the AST
     *
     * @return {ReactAst[]} Subtree of every React component in the AST
     */
    getComponents() {
        let components = this.queryAst(
            '[type="ExpressionStatement"] [callee.property.name=component]'
        );
        return components.map(a => new AngularAst(a.getContents()));
    }

    /**
     * Returns the name of the current component
     * This method only works if it is invoked on a subtree returned by getComponents()
     *
     * @return {String} Name of the current component
     */
    getName() {
        return this.getContents().arguments[0].value;
    }
}

/**
 * Utility class to perform actions on an AST structure
 */
export class AstHelper {

    /**
     * Extracts the expression found in a subtree
     * An expression would be the full variable usage (e.g. this.props.ob.foo.title...) or a method call
     * this.ob.asd.we.df.foo().
     * Method can also handle static values and arrays/objects which will just recursively traverse the nodes
     *
     * Execution can be seen as some kind of flattening the tree
     * (while losing a significant amount of additional information)
     *
     * @param  {Object}              expr Subtree nodes to extract the information
     * @return {String|Object|Array}      Flattened information contained in the subtree
     */
    static extractExpression(expr) {
        let type = expr.type;

        if (type === 'ThisExpression') {
            return 'this';
        }

        if (type === 'Identifier') {
            return expr.name;
        }

        if (type === 'Literal') {
            return expr.value;
        }

        if (type === 'MemberExpression') {
            return this.extractExpression(expr.object) + '.'+expr.property.name;
        }

        if (type === 'CallExpression') {
            return this.extractExpression(expr.callee) + '()';
        }

        if (type === 'ArrayExpression') {
            return expr.elements.map(a => this.extractExpression(a));
        }

        if (type === 'ObjectExpression') {
            let foo = {};
            expr.properties.forEach(a => {
                return foo[this.extractExpression(a.key)] = this.extractExpression(a.value)
            });
            return foo;
        }

        return null;
    }

    /**
     * Checks whether the provided parameter is a node structure that resembles the React.createElement function call
     *
     * @param  {Object}  entry Tree structure to test
     * @return {Boolean}       True if it is a React.createElement function call
     */
    static isReactCreateElement(entry) {
        return entry.type === 'CallExpression'
            && (AstHelper.extractExpression(entry).endsWith('.default.createElement()')
                    || AstHelper.extractExpression(entry) === ('React.createElement()'));
    }

    /**
     * Helper method to extract only relevant information from the tree structure of the function parameters
     *
     * @param  {Object} expr Tree structure with function parameters
     * @return {Array}       List of all parameters reduced to name and values
     */
    static extractFunctionParameters(expr) {
        if (expr.arguments === undefined || expr.arguments.length === 0) {
            return undefined;
        }

        return expr.arguments.map(a => {
            return {
                type: a.type,
                value: AstHelper.extractExpression(a)
            };
        });
    }

    /**
     * Checks whether the AST provided contains a React component definition
     *
     * @param  {Ast}     code Ast which is checked for React compliant component definitions
     * @return {Boolean}      True if a React component is present, false otherwise
     */
    static isReactCode(code)  {
        let checker = code.querySingleAst('[callee.property.name="createClass"]');

        if (!checker) return false;

        let check1 = checker.querySingleAst('[callee.object.name="React"]');
        if (check1 !== null) return true;

        let check2 = checker.querySingleAst('[callee.object.property.name="default"]');
        if (check2 !== null) return true;

        return false;
    }

    /**
     * Checks whether the AST provided contains a Angular component definition
     *
     * @param  {Ast}     code Ast which is checked for Angular compliant component definitions
     * @return {Boolean}      True if a Angular component is present, false otherwise
     */
    static isAngularCode(code)  {
        let checker = code.querySingleAst('[type="ExpressionStatement"] [callee.property.name=component]');
        return checker !== null;
    }

    /**
     * Checks whether the AST provided contains a Polymer component definition
     *
     * @param  {Ast}     code Ast which is checked for Polymer compliant component definitions
     * @return {Boolean}      True if a Polymer component is present, false otherwise
     */
    static isPolymerCode(code)  {
        let checker = code.querySingleAst('[body] [type=CallExpression][callee.type="SequenceExpression"] [property.name="default"]');

        if (checker === null) {
            checker = code.querySingleAst('[body] [type=CallExpression][callee.name=Polymer]');
        }

        return checker !== null;
    }
}