class Snake:
    def __init__(self, x, y):
        self.body = [(x, y)]
        self.direction = (0, 1)  # Initial direction: right

    def move(self):
        head_x, head_y = self.body[0]
        dir_x, dir_y = self.direction
        new_head = (head_x + dir_x, head_y + dir_y)
        self.body.insert(0, new_head)
        self.body.pop()

    def grow(self):
        head_x, head_y = self.body[0]
        dir_x, dir_y = self.direction
        new_head = (head_x + dir_x, head_y + dir_y)
        self.body.insert(0, new_head)

    def check_collision(self, board_width, board_height):
        head_x, head_y = self.body[0]
        if not (0 <= head_x < board_width and 0 <= head_y < board_height):
            return True  # Collision with wall
        if len(self.body) > 1 and self.body[0] in self.body[1:]:
            return True  # Collision with self
        return False
