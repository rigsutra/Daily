Feature: Task Management
  As a user
  I want to create, complete, and delete tasks
  So that I can track my daily productivity

  Background:
    Given the user is authenticated with a valid JWT
    And the user has no existing tasks for today

  Scenario: Add a new mandatory task
    When the user sends a POST request to "/api/tasks" with JSON payload
      """
      {
        "title": "Read a chapter",
        "target": 1,
        "unit": "chapter",
        "mandatory": true,
        "date": "2026-05-10"
      }
      """
    Then the response status should be 201
    And the response body should contain "id"
    And the task list for today should include the new task

  Scenario: Complete part of a task
    Given a task with id "{taskId}" exists and has target 5
    When the user patches "/api/tasks/{taskId}" with JSON payload
      """
      { "completed": 2 }
      """
    Then the response status should be 200
    And the task's "completed" field should be 2
    And the task should not be marked as completed

  Scenario: Complete the task fully
    Given a task with id "{taskId}" exists and has target 3
    When the user patches "/api/tasks/{taskId}" with JSON payload
      """
      { "completed": 3 }
      """
    Then the response status should be 200
    And the task should be marked as completed
    And the task's "completedAt" timestamp should be set

  Scenario: Delete a mandatory task with justification
    Given a mandatory task with id "{taskId}" exists
    When the user sends DELETE "/api/tasks/{taskId}" with JSON payload
      """
      { "justification": "Task no longer relevant" }
      """
    Then the response status should be 200
    And a DeleteRequest record should be created with the justification
    And the task should be removed from the task list
