import markdownit from 'markdown-it'
import emoji from 'markdown-it-emoji'
import math from '@rokt33r/markdown-it-math'
import hljs from 'highlight.js'
import _ from 'lodash'

const katex = window.katex

function createGutter (str) {
  let lc = (str.match(/\n/g) || []).length
  let lines = []
  for (let i = 1; i <= lc; i++) {
    lines.push('<span>' + i + '</span>')
  }
  return '<span class="lineNumber">' + lines.join('') + '</span>'
}

var md = markdownit({
  typographer: true,
  linkify: true,
  html: true,
  xhtmlOut: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs">' +
        createGutter(str) +
        '<code>' +
        hljs.highlight(lang, str).value +
        '</code></pre>'
      } catch (e) {}
    }
    return '<pre class="hljs">' +
    createGutter(str) +
    '<code>' +
    str.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\"/g, '&quot;') +
    '</code></pre>'
  }
})
md.use(emoji, {
  shortcuts: {}
})
md.use(math, {
  inlineRenderer: function (str) {
    let output = ''
    try {
      output = katex.renderToString(str.trim())
    } catch (err) {
      output = `<span class="katex-error">${err.message}</span>`
    }
    return output
  },
  blockRenderer: function (str) {
    let output = ''
    try {
      output = katex.renderToString(str.trim(), {displayMode: true})
    } catch (err) {
      output = `<div class="katex-error">${err.message}</div>`
    }
    return output
  }
})
md.use(require('markdown-it-footnote'))
// Override task item
md.block.ruler.at('paragraph', function (state, startLine/*, endLine*/) {
  let content, terminate, i, l, token
  let nextLine = startLine + 1
  let terminatorRules = state.md.block.ruler.getRules('paragraph')
  let endLine = state.lineMax

  // jump line-by-line until empty one or EOF
  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    // this would be a code block normally, but after paragraph
    // it's considered a lazy continuation regardless of what's there
    if (state.sCount[nextLine] - state.blkIndent > 3) { continue }

    // quirk for blockquotes, this line should already be checked by that rule
    if (state.sCount[nextLine] < 0) { continue }

    // Some tags can terminate paragraph without empty line.
    terminate = false
    for (i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true
        break
      }
    }
    if (terminate) { break }
  }

  content = state.getLines(startLine, nextLine, state.blkIndent, false).trim()

  state.line = nextLine

  token = state.push('paragraph_open', 'p', 1)
  token.map = [ startLine, state.line ]

  if (state.parentType === 'list') {
    let match = content.match(/^\[( |x)\] ?(.+)/i)
    if (match) {
      content = `<label class='taskListItem' for='checkbox-${startLine + 1}'><input type='checkbox'${match[1] !== ' ' ? ' checked' : ''} id='checkbox-${startLine + 1}'/> ${content.substring(4, content.length)}</label>`
    }
  }

  token = state.push('inline', '', 0)
  token.content = content
  token.map = [ startLine, state.line ]
  token.children = []

  token = state.push('paragraph_close', 'p', -1)

  return true
})

// Add line number attribute for scrolling
let originalRender = md.renderer.render
md.renderer.render = function render (tokens, options, env) {
  tokens.forEach((token) => {
    switch (token.type) {
      case 'heading_open':
      case 'paragraph_open':
      case 'blockquote_open':
      case 'table_open':
        token.attrPush(['data-line', token.map[0]])
    }
  })
  let result = originalRender.call(md.renderer, tokens, options, env)
  return result
}
window.md = md

export default function markdown (content) {
  if (!_.isString(content)) content = ''

  return md.render(content)
}
