'use strict';

class Ast {
    constructor(value) {
        this.value = value;
    }

    getContents() {
        return this.value;
    }

    asJson() {
        return JSON.stringify(this.value, null, '\t');
    }

    /**
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
     * @param  {string} query
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

class ReactAst extends Ast {
    getComponents() {
        let components = this.queryAst(
            '[body] > [type="VariableDeclaration"] > [init.type="CallExpression"]'
        );
        return components.filter(a => {
            return a.getContents().init.callee.object.name === 'React'
                    && a.getContents().init.callee.property.name === 'createClass'
        }).map(a => new ReactAst(a.getContents()));
    }
    getName() {
        return this.getContents().id.name;
    }
}

class AngularAst extends Ast {
    getComponents() {
        let components = this.queryAst(
            '[type="ExpressionStatement"] [callee.property.name=component]'
        );
        return components.map(a => new AngularAst(a.getContents()));
    }
    getName() {
        console.log('[AngularAst] getName', this.getContents());
        let name = this.querySingleAst(
            '[arguments] :first-child'
        );
        return name.getContents().value;
    }
}

class AstHelper {
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

    static isReactCreateElement(entry) {
        return entry.type === 'CallExpression' && AstHelper.extractExpression(entry) === 'React.createElement()';
    }

    static extractFunctionParameters(expr) {
        console.log('[AstHelper] extractFunctionParameters', expr);
        return expr.arguments.map(a => {
            return {
                type: a.type,
                value: AstHelper.extractExpression(a)
            };
        });
    }
}