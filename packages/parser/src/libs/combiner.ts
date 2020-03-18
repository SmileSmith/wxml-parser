import WxmlNode from '../nodes/base';
import ElementNode from '../nodes/element';
import CommentNode from '../nodes/comment';
import TextNode from '../nodes/text';
import { Connect } from './pipeline';

/**
 * 组装器，将流水线裁剪下来的文本组装成AST
 *
 * @class Combiner
 */
export default class Combiner implements Connect {
  public root: WxmlNode[];

  private option: any
  private openElementStack: ElementNode[];
  private latestOpenElement: ElementNode;

  constructor(option) {
    this.option = option;
    this.root = [];
    this.openElementStack = [];
  }

  /**
   * 获取组装产品（AST）
   *
   * @returns
   * @memberof Combiner
   */
  public getProduct() {
    const product = this.root;

    this.root = [];
    this.openElementStack = [];

    return product;
  }

  /**
   * 接收一个注释
   *
   * @param {CommentNode} comment
   * @memberof Combiner
   */
  public addComment(comment: CommentNode) {
    this.addNode(comment);
  }

  /**
   * 接收一个文本
   *
   * @param {TextNode} text
   * @memberof Combiner
   */
  public addText(text: TextNode) {
    this.addNode(text);
  }

  /**
   * 接收一个开启标签
   *
   * @param {ElementNode} element
   * @memberof Combiner
   */
  public addElementStartTag(element: ElementNode) {
    this.addNode(element);
    if (!element.isSelfClosing) {
      this.openElementStack.push(this.latestOpenElement);
      this.latestOpenElement = element;
    }
  }

  /**
   * 接收一个闭合标签
   *
   * @param {string} tagName
   * @memberof Combiner
   */
  public addElementEndTag(tagName: string) {
    if (this.latestOpenElement && this.latestOpenElement.tagName === tagName) {
      this.latestOpenElement = this.openElementStack.pop();
    }
  }

  /**
   * 添加一个节点
   *
   * @private
   * @param {WxmlNode} node
   * @memberof Combiner
   */
  private addNode(node: WxmlNode) {
    if (this.latestOpenElement) {
      this.latestOpenElement.childNodes.push(node);
    } else {
      this.root.push(node);
    }
  }
}
