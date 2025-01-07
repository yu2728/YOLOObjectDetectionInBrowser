import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

import * as tf from "@tensorflow/tfjs";
import { DetectBbox } from "./types";

/**
 * 物体検出のBBOXに変換する
 * @param result 
 * @param labelCount 
 * @param maxOutputSize 
 * @param iouThreshold 
 * @param minScore 
 * @param targetId 
 * @returns 
 */
export const resultToDetectBbox = (
  result: tf.Tensor<tf.Rank>,
  labelCount: number,
  maxOutputSize: number,
  iouThreshold: number,
  minScore: number,
  targetId?: number | undefined
): DetectBbox[] => {
  const bbox = tf.tidy(() => {
    const temp = result.squeeze();
      const x = temp.slice([0, 0], [1, -1]); // x座標
      const y = temp.slice([1, 0], [1, -1]); // y座標
      const w = temp.slice([2, 0], [1, -1]); // 幅
      const h = temp.slice([3, 0], [1, -1]); // 高さ
  
      const x1 = tf.sub(x, tf.div(w, 2))
      const y1 = tf.sub(y, tf.div(h, 2))
      const x2 = tf.add(x1, w)
      const y2 = tf.add(y1, h)
      const boxes = tf.stack([y1, x1, y2, x2], 2).squeeze();
  
      const maxScores = targetId === undefined ? temp.slice([4, 0], [labelCount, -1]).max(0) : temp.slice([targetId + 4, 0], [1, -1]).max(0)
      const labelIndexes = targetId === undefined ? temp.slice([4, 0], [labelCount, -1]).argMax(0) : tf.fill(maxScores.shape, targetId)
      const boxIndexes = tf.image.nonMaxSuppression(
          boxes.as2D(boxes.shape[0], boxes.shape[1]!),
          maxScores.as1D(), maxOutputSize, iouThreshold, minScore); 
  
      const resultBboxes = boxes.gather(boxIndexes, 0).arraySync() as []
      const resultScores = maxScores.gather(boxIndexes, 0).arraySync() as []
      const resultLabels = labelIndexes.gather(boxIndexes, 0).arraySync() as []

    return resultBboxes.map((bbox, index) => {
      return {
        x: bbox[1],
        y: bbox[0],
        w: bbox[3] - bbox[1],
        h: bbox[2] - bbox[0],
        score: resultScores[index],
        label: resultLabels[index],
      };
    });
  });
  return bbox as DetectBbox[];
};