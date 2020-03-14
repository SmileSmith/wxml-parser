/*!
 * Inspire with @vue/html-parser By John Resig (ejohn.org)
 * @see https://github.com/vuejs/vue/blob/dev/src/compiler/parser/html-parser.js
 *
 * wxml存在多个root节点
 * wxml不考虑<aa:aa></aa:aa>的场景
 * wxml不考虑<p></p></p>的场景
 *
 */


import ElementNode from '../nodes/element';
import CommentNode from '../nodes/comment';
import TextNode from '../nodes/text';
import ParseError from './error';
import { NODE_TYPES } from '../nodes/type';

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'",
};

const commentStartRegExp = /^<!--/;
const commentStartLength = '<!-- '.length;
const commentEnd = ' -->';
const commentEndLength = commentEnd.length;

// 以下正则参考vue-html-parser，略有调整
const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const tagNameRegExp = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;

const startTagOpenRegExp = new RegExp(`^<(${tagNameRegExp})`);
const startTagCloseRegExp = /^\s*(\/?)>/;

const attributeRegExp = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const attributeEncodeRegExp = /&(?:lt|gt|quot|amp|#39);/g;

const endTagRegExp = new RegExp(`^<\\/(${tagNameRegExp})[^>]*>`);

/**
 * 暴露的连接器，用于其它组件注册
 *
 * @export
 * @interface Connect
 */
export interface Connect {
  addText: (text: TextNode) => void;
  addComment: (comment: CommentNode) => void;
  addElementStartTag: (element: ElementNode) => void;
  addElementEndTag: (tagName: string) => void;
}


/**
 * 处理过程中要入栈的节点
 *
 * @class StackElementNode
 * @extends {ElementNode}
 */
class StackElementNode extends ElementNode {
  public start: number;
  public end: number;
}

/**
 * 处理内容的范围
 *
 * @interface Range
 */
interface Range {
  start: number;
  end: number;
}

/**
 * 流水线，按顺序处理输入的文本
 *
 * 解析成节点传输给组装器-Combiner
 *
 *
 * @class PipeLine
 */
export default class PipeLine {
  public combiner: Connect;
  private option: any;

  private input: string; // 当前未处理的代码
  private index: number; // 当前文本所处的位置
  private line: number; // 当前文本所处的行
  private position: number; // 当前文本所处的列
  private lastInput: string; // 剩余未处理的代码
  private stack: StackElementNode[];

  constructor(option) {
    this.option = option;
  }

  /**
   * 注册连接器
   *
   * @param {Connect} combiner
   * @memberof PipeLine
   */
  connect(combiner: Connect) {
    this.combiner = combiner;
  }


  /**
   * 开始运行，处理文本
   *
   * @param {string} input
   * @memberof PipeLine
   */
  run(input: string) {
    this.input = input;
    this.index = 0;
    this.line = 0;
    this.position = 0;
    this.lastInput = '';
    this.stack = [];
    while (this.input !== '') {
      const currentInput = this.input;
      const textEndIndex = this.input.indexOf('<');
      if (textEndIndex === 0) {
        // 1. 注释
        if (commentStartRegExp.test(this.input)) {
          const commentEndIndex = this.input.indexOf(commentEnd);
          if (commentEndIndex >= 0) {
            const commentText = this.input.substring(commentStartLength, commentEndIndex);
            this.handleComment(commentText, {
              start: 0,
              end: commentEndIndex + commentEndLength,
            });
          }
        }
        // 2. 开标签
        const startTagMatch = this.input.match(startTagOpenRegExp);
        if (startTagMatch) {
          const stackNode = this.parseStarTag(startTagMatch);
          this.handleStartTag(stackNode);
          continue;
        }

        // 3. 闭标签
        const endTagMatch = this.input.match(endTagRegExp);
        if (endTagMatch) {
          const tagName = endTagMatch[1];
          this.handleEndTag(tagName, {
            start: 0,
            end: endTagMatch[0].length,
          });
          continue;
        }
      }
      // 4. 处理文本
      this.handleText({
        start: 0,
        end: textEndIndex,
      });

      if (currentInput === this.input) {
        // 处理一遍，输入内容没有任何裁剪，说明有异常。整个当做文本节点处理
        this.handleText({
          start: 0,
          end: -1,
        });
        if (this.option.onWarn && !this.stack.length) {
          this.option.onWarn(new ParseError(`Mal-formatted tag at end of template: "${this.input}"`));
        }
        break;
      }
    }
  }


  /**
   * 裁剪
   *
   * @param {number} lenth
   * @memberof PipeLine
   */
  crop(lenth: number) {
    this.index += lenth;
    this.input = this.input.substring(lenth);
  }

  /**
   * 处理注释
   *
   * @param {string} textContent
   * @param {Range} range
   * @memberof PipeLine
   */
  handleComment(textContent: string, range: Range) {
    if (this.combiner.addComment) {
      this.combiner.addComment(new CommentNode(textContent));
    }
    this.crop(range.end);
  }

  /**
   * 处理闭标签
   *
   * @param {*} tagName
   * @param {Range} range
   * @memberof PipeLine
   */
  handleEndTag(tagName, range: Range) {
    // 匹配的stack指针
    let index;

    // a. 用endTagName匹配stack, 如果匹配到就退出循环，获得正确的stack指针
    const lowerCasedTagName = tagName && tagName.toLowerCase() || '';
    for (index = this.stack.length - 1; index >= 0; index--) {
      const stackNode = this.stack[index];
      if (this.option.onWarn) {
        this.option.onWarn(new ParseError(`tag <${stackNode.tagName}> has no matching end tag.`), {
          start: stackNode.start,
          end: stackNode.end,
        });
      }
      if (stackNode.tagName.toLowerCase() === lowerCasedTagName) {
        if (this.combiner.addElementEndTag) {
          this.combiner.addElementEndTag(stackNode.tagName);
        }
        break;
      }
    }
    // b. 删除stack指针和指针之后的开标签
    this.stack.length = index;

    this.crop(range.end);
  }


  /**
   * 解析开始标签
   *
   * @param {string[]} [ startTagOpen, tagName ]
   * @returns {StackElementNode}
   * @memberof PipeLine
   */
  parseStarTag([ startTagOpen, tagName ]: string[]): StackElementNode {
    // a. 创建一个要入stack的节点用于存储开标签
    const stackNode = new StackElementNode();
    stackNode.type = NODE_TYPES.ELEMENT;
    stackNode.tagName = tagName;
    stackNode.start = this.index;
    stackNode.end = this.index;

    // b. 获取所有属性
    const attributeList = [];
    this.crop(startTagOpen.length);

    let startTagCloseMatch; // 开标签闭合[ >]或[ />]的匹配项
    let attributeMatch; // 属性[a="b"]的匹配项
    while (
      !(startTagCloseMatch = this.input.match(startTagCloseRegExp)) &&
      (attributeMatch = this.input.match(attributeRegExp))
    ) {

      attributeMatch.start = this.index;
      this.crop(attributeMatch[0].length);
      attributeMatch.end = this.index;
      attributeList.push(attributeMatch);
    }

    // c. 判断是否自闭的开标签
    if (startTagCloseMatch) {
      stackNode.isSelfClosing = !!startTagCloseMatch[1];
      this.crop(startTagCloseMatch[0].length);
      stackNode.end = this.index;
    }

    // d. 处理所有属性，并整合到节点中
    const l = attributeList.length;
    for (let i = 0; i < l; i++) {
      const attrMatch = attributeList[i];
      const value = attrMatch[3] || attrMatch[4] || attrMatch[5] || '';
      stackNode.attributes[attrMatch[1]] = value.replace(attributeEncodeRegExp, (match) => decodingMap[match]);
    }

    // e. 非自闭和标签，推到stack中
    if (!stackNode.isSelfClosing) {
      this.stack.push(stackNode);
    }

    return stackNode;
  }

  /**
   * 处理开始标签
   *
   * @param {ElementNode} elementNode
   * @param {Range} range
   * @memberof PipeLine
   */
  handleStartTag(elementNode: ElementNode) {
    if (this.combiner.addElementStartTag) {
      this.combiner.addElementStartTag(elementNode);
    }
  }


  /**
   * 处理文本
   *
   * @param {Range} { end }
   * @memberof PipeLine
   */
  handleText({ end }: Range) {
    let text: string;
    if (end >= 0) {
      let rest, next;
      rest = this.input.slice(end);
      while (!endTagRegExp.test(rest) && !startTagOpenRegExp.test(rest) && !commentStartRegExp.test(rest)) {
        // 处理文本中含有< 的情况 ['a<b< wda<']
        next = rest.indexOf('<', 1);
        if (next < 0) break;
        end += next;
        rest = this.input.slice(end);
      }
      text = this.input.substring(0, end);
    } else {
      text = this.input;
    }

    if (text) {
      this.crop(text.length);
      if (this.combiner.addText) {
        this.combiner.addText(new TextNode(text));
      }
    }
  }

}
