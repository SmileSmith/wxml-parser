import WxmlNode from './base';
import { NODE_TYPES } from './type';

export default class ElementNode extends WxmlNode {
  public tagName: string;
  public isSelfClosing: boolean;
  public attributes: {
    [key: string]: string | true;
  };

  public childNodes: WxmlNode[];

  constructor() {
    super(NODE_TYPES.ELEMENT);
    this.tagName = '';
    this.isSelfClosing = false;
    this.attributes = {};
    this.childNodes = [];
  }

  toTree() {
    return {
      type: this.type,
      tagName: this.tagName,
      isSelfClosing: this.isSelfClosing,
      attributes: this.attributes,
      childNodes: this.childNodes.map((node: WxmlNode) => node.toTree()),
    };
  }
}
