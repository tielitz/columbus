'use strict';

import guid from './guid';

export default class AbstractPostProcessor {
    static process(ast) {
        throw new Error('Method not implemented');
    }
}

export class JsxUniqueIdPostProcessor extends AbstractPostProcessor {

    /**
     * Adds a generated id to each arg[0] of any React.createElement function call. The id is necessary to identify
     * parts in the structure from different extraction rules
     * @param  {Ast} ast
     * @return {Ast} Returns the AST with unique ids in each React.createElement call
     */
    static process(ast) {
        if (!ast instanceof ReactAst) {
            throw new Error('JsxUniqueIdPostProcessor can only be applied to React ASTs');
        }

        let nodes = ast.queryAst('[type="FunctionExpression"][id.name="render"] [callee.property.name="createElement"]');

        if (!nodes || nodes.length === 0) {
            return ast;
        }

        nodes
            // skip all nodes that contain no entry. should not happen anyway
            .filter(node => node.getContents().arguments.length > 0)
            .forEach(node => {
                node.getContents().arguments[0].myuniqid = guid();
            });

        return ast;
    }
}

export class ImportDependencyPostProcessor extends AbstractPostProcessor {

    /**
     * Replaces the ugly identifier introdec by babel when using import syntax.
     * Replaces _react2 statements with React etc..
     * @param  {Ast} ast
     * @return {Ast}
     */
    static process(ast) {

        let interops = ast.queryAst('[body]>[declarations]>[init.callee.name="_interopRequireDefault"]');

        interops.forEach(interop => {
            let identifier = interop.getContents().id.name;
            let source = ImportDependencyPostProcessor.convertToNiceFormat(interop.getContents().init.arguments[0].name);

            console.log('[ImportDependencyPostProcessor] replace '+identifier+' with '+source);

            let res = ast.queryAst('[object.type="Identifier"][object.name="'+identifier+'"]');
            res.forEach(a => {
                a.getContents().object.name = source
            });
        });

        return ast;
    }

    static convertToNiceFormat(str) {
        // remove _ at the beginning, capitalize first char and add the rest
        return str.slice(1).charAt(0).toUpperCase()+str.slice(2);
    }
}