function MessageObj(leaderID_str, prev_cursor, next_cursor, min_followers, max_messages) {
    this.leaderID_str = leaderID_str
    this.prev_cursor = prev_cursor
    this.next_cursor = next_cursor
    this.min_followers = min_followers
    this.max_messages = max_messages
}

module.exports = {MessageObj}