import WxmlNode from './base';
import { NODE_TYPES } from './type';

export default class CommentNode extends WxmlNode {
  public textContent: string;

  constructor(textContent: string) {
    super(NODE_TYPES.COMMENT);
    this.textContent = textContent;
  }

  toTree() {
    return {
      type: this.type,
      textContent: this.textContent,
    };
  }
}
