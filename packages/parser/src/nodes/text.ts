import WxmlNode from './base';
import { NODE_TYPES } from './type';

export default class TextNode extends WxmlNode {
  public textContent: string;

  constructor(textContent: string) {
    super(NODE_TYPES.TEXT);
    this.textContent = textContent;
  }

  toTree() {
    return {
      type: this.type,
      textContent: this.textContent,
    };
  }
}
