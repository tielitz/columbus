'use strict';

import template from './app-content.template.html';
import esprima from 'esprima';

import {AstParser,JsxParser,TokenParser} from './../../utils/parser';
import {FileImportExtractor} from './../../utils/shared-extractor';
import {ReactAst} from './../../utils/ast';
import {JsxUniqueIdPostProcessor,ImportDependencyPostProcessor} from './../../utils/post-processor';

import {ReactModelExtractorChain} from './../../utils/react-extractor';
import {ReactModelGenerator} from './../../utils/react-generator';

import {AngularModelExtractorChain} from './../../utils/angular-extractor';
import {AngularModelGenerator} from './../../utils/angular-generator';

import {PolymerModelExtractorChain} from './../../utils/polymer-extractor';
import {PolymerModelGenerator} from './../../utils/polymer-generator';



class AppContentComponent {
    constructor(){
        this.template = template;
        this.controller = AppContentController;
    }

}

class AppContentController{
    constructor( $window, githubReaderService) {

        this.githubReaderService = githubReaderService;
        this.$window = $window;

        // Contents of the output tab on the right
        this.syntaxContent = '';
        this.tokensContent = '';
        this.infoBaseContent  = '';
        this.dependencyGraph = '';
        this.modelContent = '';

        // Fetched contents of the GitHub repository
        this.githubRepositoryContainer = null;
        this.githubFolderStructure = null;

        // Selected file in the file explorer tab
        this.currentSelectedFile = null;

        // Information about the GitHub repository
        this.gitHubOwner = 'tielitz'; // 'Mobility-Services-Lab';
        this.gitHubRepo = 'columbus-react-example'; // 'TUMitfahrer-WebApp';
        this.gitHubSha = 'HEAD';
        this.folderToParse = '^components/.*\\.jsx$'; //'^src/components/.*\\.jsx$';

        // Shows the loading animation
        this.loading = false;

        // Contains a list o all parsing errors that occured in the last executiion
        this.parsingErrors = [];

        /**
         * Adds another entry to the parsingErrors which are displayed in the model tab
         * @param {String}           _msg  Message to display
         * @param {String|undefined} _type Severity, can be warn or error
         */
        function addOutputLog(_msg, _type) {
           // console.log('addOutputLog', _msg, _type);
            this.parsingErrors.push({
                msg: _msg,
                type: _type !== undefined ? _type : 'warn'
            });
        }



    }

    /**
     * Resets the input to the defaut values
     */
     reset() {
        this.syntaxContent = '';
        this.tokensContent = '';
        this.infoBaseContent  = '';
        this.modelContent = '';
        this.dependencyGraph = '';

        this.githubRepositoryContainer = null;
        this.githubFolderStructure = null;
        this.currentSelectedFile = null;

        this.parsingErrors = [];
    }

    parseGithub() {



        this.reset();
        this.loading = true;

        //console.log('[parseGithub] with URL ' + this.gitHubOwner + ' ' + this.gitHubRepo );
        let githubRepositoryContainer = null;

        // Fetch contents of the GitHub repository with file contents already included
        this.githubReaderService.getTreeRecursively(this.gitHubOwner, this.gitHubRepo, this.gitHubSha, this.folderToParse)
            .then(function (container) {
                //console.log('[parseGithub] finished parsing', container);
                this.githubRepositoryContainer = container;
                this.githubFolderStructure = container.getFolderStructure();

                if (container.tree.length === 0) {
                    // we found no files
                    this.loading = false;
                    alert('No files matching the regular expression found.');
                }

                // Default setup
                let astParser = new AstParser(esprima);
                let babelParser = new JsxParser();
                let fileImportExtractor = new FileImportExtractor();
                let modelExtractorChain = null;

                let extractedAstContent = {};
                let extractedTokenContent = {};
                let extractedInfoBase = {};
                let modelGenerator = null;

                // iterate over all files. Parse ast and extract information grouped by file
                for (let i = 0; i < container.tree.length; i++) {

                    let fileEntry = container.tree[i];

                    let parsedSourceCode = null;
                    let ast = null;
                    try {
                        // try to parse the source code into a framework specific AST
                        //console.log('[parseGithub] processing ' + fileEntry.path);
                        parsedSourceCode = babelParser.transform(fileEntry.source);

                        // we can always use the JsxParser. wont do any harm if no JSX is present
                        ast = astParser.parse(parsedSourceCode);
                    } catch (e) {
                        console.warn('[parseGithub] could not process file', fileEntry.path);
                        addOutputLog('Unable to process file '+fileEntry.path, 'error');
                        continue;
                    }

                    if (ast instanceof ReactAst) {
                        // Add unique ids to each entry of the template so that properties and
                        // behaviour can reference them
                        JsxUniqueIdPostProcessor.process(ast);

                        // initialise React specific information extractor and model generator
                        modelExtractorChain = new ReactModelExtractorChain();
                        modelGenerator = new ReactModelGenerator();
                    }

                    if (ast instanceof AngularAst) {
                        // initialise Angular specific information extractor and model generator
                        modelExtractorChain = new AngularModelExtractorChain();
                        modelGenerator = new AngularModelGenerator();
                    }

                    if (ast instanceof PolymerAst) {
                        // initialise Polymer specific information extractor and model generator
                        modelExtractorChain = new PolymerModelExtractorChain();
                        modelGenerator = new PolymerModelGenerator();
                    }

                    /*
                     * Replace the altered naming of import statements in the whole file
                     * Babel transforms the names of the imported dependencies to something like _foo2
                     * and this post processor converts every usage back to Foo.
                     * Might not always be correct, but worked for the projects in the evaluation
                     */
                    ImportDependencyPostProcessor.process(ast);

                    // Add AST output to view model
                    extractedAstContent[fileEntry.path] = ast.getContents();
                    extractedTokenContent[fileEntry.path] = (new TokenParser(esprima)).parse(parsedSourceCode);

                    try {
                        // Apply information extraction
                        extractedInfoBase[fileEntry.path] = modelExtractorChain.apply(ast);

                        // Add imported dependencies from the import statements at the top
                        extractedInfoBase[fileEntry.path][fileImportExtractor.descriptor()] = fileImportExtractor.extract(ast);
                    } catch (e) {
                        // something went wrong with parsing that file
                        console.warn('Could not parse file ' + fileEntry.path, e);
                        addOutputLog('Unable to process file '+fileEntry.path, 'error');
                    }

                    // check for errors in the modelExtractor
                    modelExtractorChain.getProcessErrors().forEach(a => {
                        // add error as warnings
                        addOutputLog('Failure to process the file '+fileEntry.path+' with the '+a.extractor);
                    });
                }
                // display the output of the semantic analyser & information extraction
                this.syntaxContent = JSON.stringify(extractedAstContent, null, '\t');
                this.tokensContent = JSON.stringify(extractedTokenContent, null, '\t');
                this.infoBaseContent = JSON.stringify(extractedInfoBase, null, '\t');

                // If we have extracted at least one item, perform model generation
                if (Object.keys(extractedInfoBase).length > 0) {
                    let generatedModel = modelGenerator.generate(extractedInfoBase);
                    this.modelContent = JSON.stringify(generatedModel, null, '\t');

                    this.dependencyGraph = JSON.stringify(
                        modelGenerator.createDependencyGraphModel(extractedInfoBase)
                        , null, '\t');
                }

                // finished with everything
                this.loading = false;
            }, function errorCallback(response) {
                this.loading = false;
                alert('The GitHub repository could not be fetched.');
            });
    }
}


AppContentController.$inject = ['$window', 'githubReaderService'];


export default AppContentComponent;