import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
export default [
 {ignores:['**/node_modules/**','**/dist/**','pages.mjs','*-assets.mjs','glass-theme.mjs','fitness-media.mjs','ilamy-recurrence-runtime.mjs','theme-presets/**','tasks-ui/src/vendor/**']},
 js.configs.recommended,
 {plugins:{workspace:{rules:{'jsx-uses-vars':{create(context){return {JSXOpeningElement(node){let name=node.name;while(name.type==='JSXMemberExpression')name=name.object;if(name.type==='JSXIdentifier'&&/^[A-Z]/.test(name.name))context.sourceCode.markVariableAsUsed(name.name,node);}};}}}}},rules:{'workspace/jsx-uses-vars':'error'}},
 {files:['**/*.{js,mjs,jsx,ts,tsx}'],languageOptions:{globals:{...globals.browser,...globals.node,...globals.serviceworker},parserOptions:{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true}}},rules:{'no-unused-vars':['error',{ignoreRestSiblings:true,caughtErrors:'none',varsIgnorePattern:'^_',argsIgnorePattern:'^_'}],'no-constant-condition':['error',{checkLoops:false}]}},
 {files:['**/*.{ts,tsx}'],languageOptions:{parser:tsParser},rules:{'no-undef':'off','no-unused-vars':'off'}},
 // Native adapters intentionally consume the shared HTML script scope; runtime checks cover that boundary.
 {files:['*-adapter.js','workbench-shell.js','media-library.js','media-cover-picker.js','requirements-page.js','today-tasks-page.js','workspace-autocomplete.js'],languageOptions:{sourceType:'script'},rules:{'no-undef':'off'}}
];
