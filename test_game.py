import unittest
from game import Snake, GameBoard, Food # Assuming your game logic is in game.py

class TestSnakeGame(unittest.TestCase):

    def test_game_board_initialization(self):
        board = GameBoard(10, 15)
        self.assertEqual(board.width, 10)
        self.assertEqual(board.height, 15)
        self.assertEqual(board.score, 0)
        self.assertEqual(len(board.grid), 15)
        self.assertEqual(len(board.grid[0]), 10)

    def test_snake_initialization(self):
        snake = Snake(5, 5)
        self.assertEqual(snake.body, [(5, 5)])
        # Initial direction is (1,0) as per game.py (fixed)
        self.assertEqual(snake.direction, (1, 0)) 

    def test_snake_move_right(self):
        snake = Snake(5, 5)
        snake.direction = (1, 0) # Set direction to right
        snake.move()
        self.assertEqual(snake.body[0], (6, 5))

    def test_snake_move_left(self):
        snake = Snake(5, 5) # Initial dir (1,0) RIGHT
        # Cannot move left directly from right. Must turn, e.g., up then left.
        snake.move_up()    # dir becomes (0,-1) UP
        self.assertEqual(snake.direction, (0,-1))
        snake.move()       # head at (5,4)
        self.assertEqual(snake.body[0], (5,4))
        
        snake.move_left()  # dir becomes (-1,0) LEFT
        self.assertEqual(snake.direction, (-1,0))
        snake.move()       # head at (4,4)
        self.assertEqual(snake.body[0], (4,4))

    def test_snake_move_up(self):
        snake = Snake(5, 5) # Initial dir (1,0) RIGHT
        snake.move_up()    # dir becomes (0,-1) UP
        self.assertEqual(snake.direction, (0,-1))
        snake.move()
        self.assertEqual(snake.body[0], (5, 4))

    def test_snake_move_down(self):
        snake = Snake(5, 5) # Initial dir (1,0) RIGHT
        snake.move_down()  # dir becomes (0,1) DOWN
        self.assertEqual(snake.direction, (0,1))
        snake.move()
        self.assertEqual(snake.body[0], (5, 6))

    def test_snake_valid_direction_changes(self):
        snake = Snake(5, 5)
        self.assertEqual(snake.direction, (1,0)) # Initial: Right

        # Right -> Up
        snake.move_up()
        self.assertEqual(snake.direction, (0,-1), "Failed: Right -> Up")

        # Up -> Left
        snake.move_left()
        self.assertEqual(snake.direction, (-1,0), "Failed: Up -> Left")

        # Left -> Down
        snake.move_down()
        self.assertEqual(snake.direction, (0,1), "Failed: Left -> Down")

        # Down -> Right
        snake.move_right()
        self.assertEqual(snake.direction, (1,0), "Failed: Down -> Right")

    def test_snake_prevent_180_degree_turns(self):
        snake = Snake(5,5) # Initial: Right (1,0)

        # Try Right -> Left (180 deg)
        snake.direction = (1,0) # Ensure Right
        snake.move_left() # Attempt to move Left
        self.assertEqual(snake.direction, (1,0), "Prevented: Right -> Left")

        # Try Left -> Right (180 deg)
        snake.direction = (-1,0) # Set Left
        snake.move_right() # Attempt to move Right
        self.assertEqual(snake.direction, (-1,0), "Prevented: Left -> Right")

        # Try Up -> Down (180 deg)
        snake.direction = (0,-1) # Set Up
        snake.move_down() # Attempt to move Down
        self.assertEqual(snake.direction, (0,-1), "Prevented: Up -> Down")
        
        # Try Down -> Up (180 deg)
        snake.direction = (0,1) # Set Down
        snake.move_up() # Attempt to move Up
        self.assertEqual(snake.direction, (0,1), "Prevented: Down -> Up")

    def test_snake_grow(self):
        snake = Snake(5, 5)
        snake.direction = (1, 0) # Right
        initial_length = len(snake.body)
        
        # Simulate eating food by setting grows=True in move()
        snake.move(grows=True) 
        self.assertEqual(len(snake.body), initial_length + 1)
        self.assertEqual(snake.body[0], (6,5)) # New head
        self.assertEqual(snake.body[1], (5,5)) # Old head becomes second segment

    def test_wall_collision_right(self):
        snake = Snake(9, 5) # Head at (9,5) on a 10-width board
        snake.direction = (1,0) # Moving right
        snake.move() # New head would be (10,5)
        self.assertTrue(snake.check_collision(10, 10))

    def test_wall_collision_left(self):
        snake = Snake(0, 5) # Head at (0,5)
        snake.direction = (-1,0) # Moving left
        snake.move() # New head would be (-1,5)
        self.assertTrue(snake.check_collision(10, 10))

    def test_wall_collision_up(self):
        snake = Snake(5, 0) # Head at (5,0)
        snake.direction = (0,-1) # Moving up
        snake.move() # New head would be (5,-1)
        self.assertTrue(snake.check_collision(10, 10))

    def test_wall_collision_down(self):
        snake = Snake(5, 9) # Head at (5,9) on a 10-height board
        snake.direction = (0,1) # Moving down
        snake.move() # New head would be (5,10)
        self.assertTrue(snake.check_collision(10, 10))

    def test_no_wall_collision(self):
        snake = Snake(5,5)
        snake.direction = (1,0)
        snake.move() # head at (6,5)
        self.assertFalse(snake.check_collision(10,10))


    def test_self_collision(self):
        snake = Snake(5, 5)
        snake.direction = (1,0) # Right
        # Manually create a body that will cause collision
        # Head (5,5), Body (6,5), (7,5), (8,5)
        # If it moves left from (5,5) to (4,5) -> no collision
        # If it moves right from (8,5) into (7,5) -> collision
        snake.body = [(7,5), (6,5), (5,5), (4,5)] # Head at (7,5)
        snake.direction = (-1,0) # Set to move left
        snake.move() # New head will be (6,5), which is in its body
        self.assertTrue(snake.check_collision(10,10))

    def test_no_self_collision(self):
        snake = Snake(5,5)
        snake.direction = (1,0)
        snake.body = [(5,5), (4,5), (3,5)]
        snake.move() # Head becomes (6,5)
        self.assertFalse(snake.check_collision(10,10))
        
    def test_food_spawn_not_on_snake(self):
        board_width = 5
        board_height = 1 
        # Create a snake that fills almost the entire board
        snake_body = []
        for i in range(board_width -1): # snake fills (0,0) to (3,0)
            snake_body.append((i,0))
        
        # Try to spawn food multiple times, it should always find the last empty spot
        # The only empty spot is (4,0)
        for _ in range(20): # Try spawning multiple times
            food = Food(board_width, board_height, snake_body)
            self.assertEqual(food.position, (board_width -1, 0))

    def test_food_spawn_empty_board(self):
        food = Food(1,1,[]) # 1x1 board, no snake
        self.assertEqual(food.position, (0,0))
        
    def test_snake_initial_direction_in_game(self):
        # This test confirms the snake's initial direction is (1,0) RIGHT,
        # as per the correction made in game.py's Snake.__init__
        snake = Snake(0,0)
        self.assertEqual(snake.direction, (1,0), "Snake initial direction should be (1,0) -> RIGHT")


if __name__ == '__main__':
    unittest.main()
