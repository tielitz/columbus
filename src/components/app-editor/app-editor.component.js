'use strict';

import * as ace from 'brace';
import 'brace/mode/javascript';


class AppEditorComponent {
    constructor( $timeout){

        this.restrict = 'E';
        this.scope = {
            type: '@',
            readonly: '@',
            content: '='
        };


        this.$timeout = $timeout;

    }

    link(scope, elem, attrs) {

        let node = elem[0];

        let mode ='';
        switch (scope.type) {
            case 'json':
                mode = 'ace/mode/json';
                break;
            case 'javascript':
                mode = 'ace/mode/javascript';
                break;
            default:
                mode = 'ace/mode/text';
        }


        // Define custom styles to fit into the material design
        node.style.display='block';
        node.style.margin ='10px';

        let editor = ace.edit(node);
        editor.session.setMode(mode);
        editor.$blockScrolling = Infinity;
        editor.setAutoScrollEditorIntoView(true);
        editor.setOption("minLines", 5);
        editor.setOption("maxLines", 35);

        if (mode === 'ace/mode/json') {
            editor.setOption('tabSize', 2);
        }

        if (scope.readonly !== undefined) {
            editor.setReadOnly(true);
        }

        // disables syntax checker
        editor.getSession().setUseWorker(false);

        // Watch 'content' and update content whenever it changes
        scope.$watch('content', function(newValue, oldValue) {
            // only update the contents if it is different
            // fixes the bug that the curser jumpes at the
            // end of the editor after each key stroke
            if (editor.getValue() !== newValue) {
                editor.setValue(newValue);
                editor.clearSelection();
            }
        }, true);


        editor.on("change", function(e) {
            this.$timeout(function() {
                scope.content = editor.getValue();
            });
        });

    }


}



AppEditorComponent.$inject = ['$timeout'];



export default AppEditorComponent;