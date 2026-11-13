import unittest
from gerar_horario import solve


class SchedulingTests(unittest.TestCase):
    def test_shared_class_counts_once_and_blocks_both_groups(self):
        config = {'total_slots': 2, 'professores': [
            {'id': 'p', 'disponiveis': [0, 1]}, {'id': 'q', 'disponiveis': [0, 1]}],
            'ofertas': [
                {'id': 'clone', 'professor': 'p', 'blocos': 1, 'componentes': [
                    {'turma': 'ADS3', 'disciplina': 'A'}, {'turma': 'EDC3', 'disciplina': 'B'}]},
                {'id': 'other', 'professor': 'q', 'blocos': 1, 'componentes': [
                    {'turma': 'EDC3', 'disciplina': 'C'}]}]}
        result = solve(config)['aulas']
        self.assertEqual(len(result), 2)
        self.assertNotEqual(result[0]['slot'], result[1]['slot'])

    def test_unavailable_teacher_is_infeasible(self):
        with self.assertRaisesRegex(ValueError, 'Não existe horário'):
            solve({'total_slots': 1, 'professores': [{'id': 'p', 'disponiveis': []}],
                   'ofertas': [{'id': 'a', 'professor': 'p', 'blocos': 1,
                                'componentes': [{'turma': 'ADS1', 'disciplina': 'A'}]}]})


if __name__ == '__main__':
    unittest.main()
