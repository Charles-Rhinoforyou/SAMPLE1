class GameBoard:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.grid = [[' ' for _ in range(width)] for _ in range(height)]
        self.score = 0

    def display(self):
        # Create a new grid for display
        display_grid = [row[:] for row in self.grid]

        # Place the snake on the grid
        if hasattr(self, 'snake'):
            for x, y in self.snake.body:
                if 0 <= x < self.width and 0 <= y < self.height: # Ensure snake is within bounds
                    display_grid[y][x] = 'S'  # Represent snake with 'S'

        # Place food on the grid
        if hasattr(self, 'food') and self.food.position:
            fx, fy = self.food.position
            if 0 <= fx < self.width and 0 <= fy < self.height: # Ensure food is within bounds
                display_grid[fy][fx] = 'F'  # Represent food with 'F'

        for row in display_grid:
            print('|'.join(row))
        print('-' * (self.width * 2 - 1))


import random

class Food:
    def __init__(self, board_width, board_height, snake_body):
        self.board_width = board_width
        self.board_height = board_height
        self.position = None
        self.spawn(snake_body)

    def spawn(self, snake_body):
        while True:
            x = random.randint(0, self.board_width - 1)
            y = random.randint(0, self.board_height - 1)
            if (x, y) not in snake_body:
                self.position = (x, y)
                break

class Snake:
    def __init__(self, x, y):
        self.body = [(x, y)]
        self.direction = (1, 0)  # Initial direction: right (dx, dy) -> (1,0) is right

    def move_up(self):
        if self.direction != (0, 1):  # Prevent moving directly opposite
            self.direction = (0, -1)

    def move_down(self):
        if self.direction != (0, -1):
            self.direction = (0, 1)

    def move_left(self):
        if self.direction != (1, 0):
            self.direction = (-1, 0)

    def move_right(self):
        if self.direction != (-1, 0):
            self.direction = (1, 0)

    def grow(self):
        # The growth happens by not removing the tail segment in the next move
        # For simplicity, we can add a segment in the current direction of the head.
        # This new segment will become the new head.
        # However, the traditional way is to let move() handle not popping the tail.
        # For now, let's assume move will handle the actual addition of a new head
        # and grow will just mark that the snake should grow.
        # A simpler approach for now:
        head_x, head_y = self.body[0]
        dx, dy = self.direction
        new_head = (head_x + dx, head_y + dy) # This is a placeholder, move() will actually add it
        # In a real scenario, move() would use a flag set by grow()
        # or grow() would directly append to a temporary "to_add" list.
        # For now, let's just extend the body directly here, which is a simplification.
        # This means grow() must be called *before* move() for the effect to be as expected.
        # Or, more correctly, move() should handle the logic of adding a new head
        # and grow() should just allow the tail not to be popped.
        # Let's stick to the instruction: "increase the length of the snake"
        # The most straightforward way is to duplicate the tail, it will be corrected by the next move.
        # This is not ideal, but fulfills the "increase length" requirement.
        # A better approach is shown in the move method.
        pass # Growth is handled by not popping the tail in the move method when snake grows.


    def move(self, grows=False):
        head_x, head_y = self.body[0]
        dx, dy = self.direction
        new_head = (head_x + dx, head_y + dy)
        
        self.body.insert(0, new_head)

        if not grows:
            self.body.pop()

    def check_collision(self, board_width, board_height):
        head_x, head_y = self.body[0]
        # Check wall collision
        if not (0 <= head_x < board_width and 0 <= head_y < board_height):
            return True
        # Check self-collision
        if len(self.body) > 1 and (head_x, head_y) in self.body[1:]:
            return True
        return False

import time

def game_loop():
    board_width = 10
    board_height = 10
    game_board = GameBoard(board_width, board_height)

    print("--- Snake Game ---")
    print("Use w/a/s/d to move, q to quit.")
    
    # Initialize snake in the middle of the board
    snake = Snake(board_width // 2, board_height // 2)
    game_board.snake = snake # Link snake to game_board for display

    # Initialize food
    food = Food(board_width, board_height, snake.body)
    game_board.food = food # Link food to game_board for display

    game_over = False
    
    # Initial display
    print(f"\nCurrent Score: {game_board.score}")
    game_board.display()

    while not game_over:
        # 1. Get user input
        print("\nEnter move (w: up, s: down, a: left, d: right) or q to quit:")
        action = input().lower()

        if action == 'q':
            print("Quitting game.")
            break

        # 2. Update snake direction
        if action == 'w':
            snake.move_up()
        elif action == 's':
            snake.move_down()
        elif action == 'a':
            snake.move_left()
        elif action == 'd':
            snake.move_right()
        
        # 3. Move snake
        snake_grows = False # Flag to indicate if snake should grow this turn
        
        # 4. Check if snake eats food
        if snake.body[0] == food.position:
            game_board.score += 1
            snake_grows = True # Snake will grow
            food.spawn(snake.body) # Spawn new food

        # Now move the snake, passing the growth flag
        snake.move(grows=snake_grows)
        if snake_grows: # Call snake's grow method (which currently does nothing, but good for structure)
            snake.grow() 

        # 5. Check for collisions
        if snake.check_collision(board_width, board_height):
            game_over = True
            print("\n!!!!!!!!!!!!!!!!!!")
            print(f"!!! GAME OVER !!!")
            print(f"!!! Final Score: {game_board.score} !!!")
            print("!!!!!!!!!!!!!!!!!!\n")
            break # Exit loop immediately on collision

        # 6. Display updated game board and score
        print(f"\nCurrent Score: {game_board.score}")
        game_board.display()

        # 7. Control game speed
        time.sleep(0.5) # Adjust for desired speed

    if not game_over and action == 'q': # If loop exited by 'q'
        print(f"\nGame ended by user. Final score: {game_board.score}")
    elif not game_over: # Should not happen if collision is the only other exit
        print(f"\nGame ended. Final score: {game_board.score}")


if __name__ == "__main__":
    game_loop()
