'use strict';

const async = require('async');
const db = require('../../database');

const batch = require('../../batch');

module.exports = {
	name: 'Fix category topic zsets',
	timestamp: Date.UTC(2018, 9, 11),
	method: function (callback) {
		const { progress } = this;

		const topics = require('../../topics');
		batch.processSortedSet('topics:tid', (tids, next) => {
			async.eachSeries(tids, (tid, next) => {
				progress.incr();

				async.waterfall([
					function (next) {
						db.getObjectFields(`topic:${tid}`, ['cid', 'pinned', 'postcount'], next);
					},
					function (topicData, next) {
						if (parseInt(topicData.pinned, 10) === 1) {
							return setImmediate(next);
						}
						topicData.postcount = parseInt(topicData.postcount, 10) || 0;
						db.sortedSetAdd(`cid:${topicData.cid}:tids:posts`, topicData.postcount, tid, next);
					},
					function (next) {
						topics.updateLastPostTimeFromLastPid(tid, next);
					},
				], next);
			}, next);
		}, {
			progress: progress,
		}, callback);
	},
};
