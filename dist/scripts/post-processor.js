class AbstractPostProcessor {
    static process(ast) {
        throw new Error('Method not implemented');
    }
}

class JsxUniqueIdPostProcessor extends AbstractPostProcessor {

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