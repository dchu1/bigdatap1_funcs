function LeaderObj(leader_id_str, follower_obj_array) {
        this.leader_id_str = leader_id_str
        this.followers = follower_obj_array
    }

function FollowerObj(follower_id_str, tweet_obj_array) {
        this.follower_id_str = follower_id_str
        this.tweets = tweet_obj_array
    }

function TweetObj(tweet_id_str, tweet_message) {
        this.tweet_id_str = tweet_id_str
        this.tweet_message = tweet_message
    }

module.exports = {
    LeaderObj, 
    FollowerObj, 
    TweetObj
}